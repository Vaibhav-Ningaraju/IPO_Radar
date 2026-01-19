import json
import time
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from pymongo import MongoClient
from dotenv import load_dotenv
import os

BASE_URL = "https://groww.in"

OPEN_URL = "https://groww.in/ipo/open?filter=mainboard"
UPCOMING_URL = "https://groww.in/ipo/upcoming?filter=mainboard"
CLOSED_URL = "https://groww.in/ipo/closed?filter=mainboard"

OUTPUT_FILE = "groww_mainboard_ipos_clean.json"

LIMIT = 20   # 👈 change this to limit number of IPOs scraped


# ---------------- DRIVER ----------------

def setup_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )


# ---------------- IPO LIST HELPERS ----------------

def is_valid_ipo_url(href):
    return href and href.startswith("/ipo/") and href.endswith("-ipo")



def get_open_upcoming_ipos(driver, url, status_label):
    driver.get(url)
    time.sleep(10)

    soup = BeautifulSoup(driver.page_source, "lxml")
    ipos = []
    
    # Strategy 1: Look for explicit <a> tags (works for Upcoming)
    links = soup.select('a[href^="/ipo/"]')
    
    if links:
        for a in links:
            href = a.get("href")
            if not is_valid_ipo_url(href): continue
            name = a.get_text(strip=True)
            if not name: continue
            
            ipos.append({
                "name": name,
                "url": BASE_URL + href,
                "status": status_label
            })
    
    # Strategy 2: If no links found (likely Open/Closed table), construct from rows
    # Only if Strategy 1 found nothing, or supplement? 
    # Usually Open page has NO links in table.
    
    if not ipos:
        # Try finding table rows
        rows = soup.select('tr')
        for row in rows:
            # Check if it looks like an IPO row (has td)
            tds = row.find_all('td')
            if not tds: continue
            
            # Usually Name is in first or second column or in a specific class
            # Browser inspection said "tr.tableComponent_tableRow..." and name is plain text
            # We'll grab text from first cell
            name_text = row.get_text(" ", strip=True).split("   ")[0] # Simple hack or specific cell?
            
            # Use specific cell if possible. 
            # In Closed IPOs function we used: name_tag = row.select_one('span[aria-label="Company name"]')
            # Maybe Open works same?
            # Let's try grabbing the first bold text or just the name.
            
            # Let's try to extract proper name element if possible
            # Or just use the first td's text.
            if len(tds) > 0:
                raw_name = tds[0].get_text(strip=True)
            else:
                continue

            if not raw_name or "Company" in raw_name: continue # Skip header

            # Clean name for slug
            # e.g. "Bharat Coking Coal" -> "bharat-coking-coal"
            # Remove special chars?
            slug = raw_name.lower().replace("&", "and").replace(" ", "-").replace("(", "").replace(")", "").replace(".", "")
            # Remove repeating dashes
            while "--" in slug: slug = slug.replace("--", "-")
            
            url = f"/ipo/{slug}-ipo"
            # Note: This is a guess. Constructing URL might be brittle if pattern mismatches.
            # But better than nothing.
            
            ipos.append({
                "name": raw_name,
                "url": BASE_URL + url,
                "status": status_label
            })

    print(f"DEBUG: Found {len(ipos)} IPOs at {url}")
    return ipos


def get_closed_ipos(driver):
    driver.get(CLOSED_URL)
    time.sleep(5)

    soup = BeautifulSoup(driver.page_source, "lxml")
    ipos = []

    for row in soup.select("tr.cur-po"):
        name_tag = row.select_one('span[aria-label="Company name"]')
        tds = row.find_all("td")

        if not name_tag or len(tds) < 2:
            continue

        board = tds[1].get_text(strip=True)
        if board != "Mainboard":
            continue

        name = name_tag.get_text(strip=True)
        slug = name.lower().replace("&", "and").replace(" ", "-")
        url = f"{BASE_URL}/ipo/{slug}-ipo"

        ipos.append({
            "name": name,
            "url": url,
            "status": "closed"
        })

    return ipos


# ---------------- STRENGTHS & RISKS (YOUR LOGIC) ----------------

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def extract_strengths_risks(driver, ipo):
    driver.get(ipo["url"])
    time.sleep(3)

    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(2)

    result = {
        "name": ipo["name"],
        "url": ipo["url"],
        "strengths": [],
        "risks": []
    }

    # ---- Extract Strengths (default view) ----
    soup = BeautifulSoup(driver.page_source, "lxml")
    heading = soup.find("h2", string=lambda x: x and "Strengths" in x and "Risks" in x)
    if not heading:
        return result

    container = heading.find_parent("div", class_=lambda x: x and "col" in x)
    if not container:
        return result

    for block in container.select("div.flex"):
        text_div = block.find("div", class_="bodyLarge")
        if not text_div:
            continue

        text = text_div.get_text(strip=True)
        if text:
            result["strengths"].append(text)

    # ---- Click "Risks" pill ----
    try:
        risks_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//span[text()='Risks']/ancestor::div[contains(@class,'pill')]"))
        )
        driver.execute_script("arguments[0].click();", risks_btn)
        time.sleep(2)
    except:
        return result  # no risks section available

    # ---- Extract Risks ----
    soup = BeautifulSoup(driver.page_source, "lxml")
    heading = soup.find("h2", string=lambda x: x and "Strengths" in x and "Risks" in x)
    container = heading.find_parent("div", class_=lambda x: x and "col" in x)

    for block in container.select("div.flex"):
        text_div = block.find("div", class_="bodyLarge")
        if not text_div:
            continue

        text = text_div.get_text(strip=True)
        if text:
            result["risks"].append(text)

    return result


# ---------------- MAIN ----------------

def main():
    # Setup MongoDB
    try:
        load_dotenv()
        mongo_uri = os.getenv("MONGO_URI")
        if not mongo_uri:
            raise ValueError("MONGO_URI not found in environment variables")
        
        client = MongoClient(mongo_uri)
        db = client["ipo-radar"]
        collection = db["ipos"]
        print("✅ Connected to MongoDB")
    except Exception as e:
        print(f"❌ MongoDB Connection Failed: {e}")
        return

    driver = setup_driver()
    all_ipos = {}

    print("🔍 Fetching IPO list from Groww...")
    for ipo in get_open_upcoming_ipos(driver, OPEN_URL, "open"):
        all_ipos[ipo["url"]] = ipo

    for ipo in get_open_upcoming_ipos(driver, UPCOMING_URL, "upcoming"):
        all_ipos[ipo["url"]] = ipo

    for ipo in get_closed_ipos(driver):
        all_ipos[ipo["url"]] = ipo

    print(f"Valid IPO pages found: {len(all_ipos)}")

    sorted_ipos = list(all_ipos.values())
    
    for idx, ipo in enumerate(sorted_ipos, 1):
        if idx > LIMIT:
            print(f"Reached limit of {LIMIT} IPOs. Stopping.")
            break

        print(f"[{idx}/{len(sorted_ipos)}] Processing: {ipo['name']} ({ipo['status']})")

        try:
            data = extract_strengths_risks(driver, ipo)
            
            # Upsert into MongoDB regardless of strengths/risks to update STATUS
            # We map 'strengths' and 'risks' into the 'values' object
            
            update_fields = {
                "ipo_name": data["name"], # Ensure name is set for upsert
                "groww_url": data["url"],
                "status": ipo["status"],  # <--- UPDATE STATUS
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            
            # Only add values if they exist, otherwise don't overwrite with empty lists if we want to preserve old data?
            # Actually, if we are re-scraping, we probably want the latest.
            if data["strengths"] or data["risks"]:
                update_fields["values.strengths"] = data["strengths"]
                update_fields["values.risks"] = data["risks"]
            
            update_doc = { "$set": update_fields }
            
            collection.update_one(
                {"ipo_name": data["name"]}, # Match by name
                update_doc,
                upsert=True
            )
            
            status_msg = "✅ Saved" if (data["strengths"] or data["risks"]) else "✅ Status Updated"
            print(f"   {status_msg}")
                
        except Exception as e:
            print(f"   ❌ Error scraping details: {e}")

    driver.quit()
    print("\n✅ Groww Scraper Finished.")

if __name__ == "__main__":
    main()
