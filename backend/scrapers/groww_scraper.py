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

LIMIT = 50


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

    # 🔹 Special handling only for UPCOMING page
    if status_label == "upcoming":
        for row in soup.select("tr.cur-po"):
            name_tag = row.select_one('span[aria-label="Company name"]')
            link_tag = row.select_one('a[href^="/ipo/"]')
            tds = row.find_all("td")

            if not name_tag or not link_tag or len(tds) < 3:
                continue

            opening_date = tds[2].get_text(strip=True)

            if opening_date.lower() == "to be announced":
                continue

            href = link_tag.get("href")
            if not is_valid_ipo_url(href):
                continue

            ipos.append({
                "name": name_tag.get_text(strip=True),
                "url": BASE_URL + href,
                "status": "upcoming",
                "opening_date": opening_date
            })

        print(f"DEBUG: Found {len(ipos)} UPCOMING IPOs with real dates")
        return ipos

    # 🔹 Original behavior for OPEN
    links = soup.select('a[href^="/ipo/"]')
    if links:
        for a in links:
            href = a.get("href")
            if not is_valid_ipo_url(href):
                continue
            name = a.get_text(strip=True)
            if not name:
                continue

            ipos.append({
                "name": name,
                "url": BASE_URL + href,
                "status": status_label
            })

    # 🔹 Fallback table logic (unchanged)
    if not ipos:
        rows = soup.select('tr')
        for row in rows:
            tds = row.find_all('td')
            if not tds:
                continue

            if len(tds) > 0:
                raw_name = tds[0].get_text(strip=True)
            else:
                continue

            if not raw_name or "Company" in raw_name:
                continue

            slug = raw_name.lower().replace("&", "and").replace(" ", "-").replace("(", "").replace(")", "").replace(".", "")
            while "--" in slug:
                slug = slug.replace("--", "-")

            url = f"/ipo/{slug}-ipo"

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


# ---------------- STRENGTHS & RISKS ----------------

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

    try:
        risks_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//span[text()='Risks']/ancestor::div[contains(@class,'pill')]"))
        )
        driver.execute_script("arguments[0].click();", risks_btn)
        time.sleep(2)
    except:
        return result

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
            break

        print(f"[{idx}/{len(sorted_ipos)}] Processing: {ipo['name']} ({ipo['status']})")

        try:
            data = extract_strengths_risks(driver, ipo)

            update_fields = {
                "ipo_name": data["name"],
                "groww_url": data["url"],
                "status": ipo["status"],
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }

            if "opening_date" in ipo:
                update_fields["opening_date"] = ipo["opening_date"]

            if data["strengths"] or data["risks"]:
                update_fields["values.strengths"] = data["strengths"]
                update_fields["values.risks"] = data["risks"]

            collection.update_one(
                {"ipo_name": data["name"]},
                {"$set": update_fields},
                upsert=True
            )

            print("   ✅ Saved / Updated")

        except Exception as e:
            print(f"   ❌ Error: {e}")

    driver.quit()
    print("\n✅ Groww Scraper Finished.")


if __name__ == "__main__":
    main()
