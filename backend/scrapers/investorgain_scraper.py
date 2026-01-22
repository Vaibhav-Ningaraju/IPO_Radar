import json
import time
import os
from dotenv import load_dotenv
from pymongo import MongoClient
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

load_dotenv()

BASE_URL = "https://www.investorgain.com"
INDEX_URL = "https://www.investorgain.com/report/live-ipo-gmp/331/"

# MongoDB Setup
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "ipo-radar"
COLLECTION_NAME = "ipos"

try:
    client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    print("✅ Connected to MongoDB")
except Exception as e:
    print("❌ MongoDB Connection Error:", e)
    client = None


def setup_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )


def get_all_gmp_links(driver):
    print("🔍 Loading InvestorGain Live GMP page...")
    driver.get(INDEX_URL)
    time.sleep(5)

    soup = BeautifulSoup(driver.page_source, "lxml")
    links = set()

    # 👉 Each IPO row has an <a href="/gmp/..."> with IPO name as text
    for a in soup.select('a[href^="/gmp/"]'):
        name = a.get_text(strip=True)

        # 🚫 Skip SME IPOs
        if "SME" in name.upper():
            continue

        href = a.get("href")
        if href and href.count("/") >= 3:
            links.add(BASE_URL + href)

    print(f"✅ Found {len(links)} NON-SME GMP pages")
    return sorted(links)


def parse_gmp_table(driver, url):
    driver.get(url)
    time.sleep(4)

    soup = BeautifulSoup(driver.page_source, "lxml")

    # Extract IPO Name from H1
    h1 = soup.find("h1")
    ipo_name = h1.get_text(strip=True).replace(" GMP", "").replace(" IPO", "").strip() if h1 else "Unknown"

    # Find the GMP table specifically by headers
    table = None
    tables = soup.find_all("table")
    for t in tables:
        headers = [th.get_text(strip=True).lower() for th in t.select("thead th")]
        # GMP table typically has 'gmp' or 'ipo price'
        if any(keyword in headers for keyword in ['gmp', 'ipo price', 'gmp(₹)']):
             table = t
             break
    
    if not table:
        # Fallback to schema logic if header search fails, or just return empty
        wrapper = soup.find("div", class_="table-responsive", itemtype="http://schema.org/Table")
        if wrapper:
             table = wrapper.find("table")
    
    if not table:
         return ipo_name, None, []

    rows = []
    latest_gmp = None
    latest_sub = None
    
    for tr in table.select("tbody tr"):
        tds = tr.find_all("td")
        if len(tds) < 8:
            continue

        row_data = {
            "gmp_date": tds[0].get_text(strip=True),
            "ipo_price": tds[1].get_text(strip=True),
            "gmp": tds[2].get_text(" ", strip=True),
            "subscription": tds[3].get_text(strip=True),
            "sub2_sauda": tds[4].get_text(strip=True),
            "estimated_listing_price": tds[5].get_text(" ", strip=True),
            "estimated_profit": tds[6].get_text(strip=True),
            "last_updated": tds[7].get_text(strip=True),
        }
        rows.append(row_data)

        # Capture latest available data (first row usually)
        if not latest_gmp and row_data["gmp"] != "--": 
             latest_gmp = row_data
        if not latest_sub and row_data["subscription"] != "--":
             latest_sub = row_data

    
    # Use first row as fallback if no valid data found yet
    if rows and not latest_gmp: latest_gmp = rows[0]

    return ipo_name, latest_gmp, rows


def main():
    if not client:
        print("Aborting due to no DB connection")
        return

    driver = setup_driver()
    gmp_links = get_all_gmp_links(driver)

    for i, url in enumerate(gmp_links, 1):
        print(f"[{i}/{len(gmp_links)}] Scraping {url}")
        
        try:
            name, gmp_data, gmp_trend = parse_gmp_table(driver, url)

            if not gmp_data:
                print("   ⚠️ GMP table not found")
                continue
            
            # Prepare update payload
            # Clean up keys for 'values' map in MongoDB
            update_data = {
                "values.gmp": gmp_data.get("gmp"),
                "values.subscription": gmp_data.get("subscription"),
                "values.estimated_listing_price": gmp_data.get("estimated_listing_price"),
                "values.gmp_updated": gmp_data.get("gmp_date"),
                "values.gmp_last_updated": gmp_data.get("last_updated"),
                "values.investorgain_url": url,
                "values.gmp_trend": gmp_trend  # Save full history
            }
            
            # Try to match existing IPO in DB
            # Matches roughly by name. 
            # Note: This might create duplicates if names don't match exactly.
            # Using regex to improve match chance? Or just update_one with upsert=True?
            # User asked to "store data", implying updates.
            # I will use upsert=True on 'ipo_name'.
            
            collection.update_one(
                {"ipo_name": name}, 
                {"$set": update_data}, 
                upsert=True
            )
            print(f"   ✅ Updated {name}")

        except Exception as e:
            print(f"   ❌ Error: {e}")

    driver.quit()
    print("✅ InvestorGain Scraper finished.")


if __name__ == "__main__":
    main()
