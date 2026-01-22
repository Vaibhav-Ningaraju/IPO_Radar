import time
import os
import requests
from dotenv import load_dotenv
from pymongo import MongoClient
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

load_dotenv()

BASE_URL = "https://www.investorgain.com"

IPO_LIST_API = "https://webnodejs.investorgain.com/cloud/ipodashboard/ipoList-read/IPO"
GMP_LIST_API = "https://webnodejs.investorgain.com/cloud/ipodashboard/gmpList-read/IPO"
SUB_LIST_API = "https://webnodejs.investorgain.com/cloud/ipodashboard/iposubscription-read/IPO"

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "ipo-radar"
COLLECTION_NAME = "ipos"

try:
    client = MongoClient(MONGO_URI)
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


def fetch_api_data():
    ipo_map = {}

    ipo_list = requests.get(IPO_LIST_API, timeout=30).json().get("ipoList", [])
    gmp_list = requests.get(GMP_LIST_API, timeout=30).json().get("ipoList", [])
    sub_list = requests.get(SUB_LIST_API, timeout=30).json().get("ipoList", [])

    for ipo in ipo_list:
        ipo_map[ipo["id"]] = {
            "id": ipo["id"],
            "name": ipo["company_short_name"],
            "slug": ipo["urlrewrite_folder_name"],
            "status": ipo.get("ipo_status"),
        }

    for g in gmp_list:
        if g["id"] in ipo_map:
            ipo_map[g["id"]].update({
                "gmp": g.get("gmp"),
                "ipo_price": g.get("ipo_price"),
            })

    for s in sub_list:
        if s["id"] in ipo_map:
            ipo_map[s["id"]]["subscription"] = s.get("Total")

    final = []
    for v in ipo_map.values():
        if "slug" in v and "id" in v:
            v["gmp_url"] = f"{BASE_URL}/gmp/{v['slug']}-gmp/{v['id']}/"
            final.append(v)

    print(f"✅ API merged {len(final)} IPOs")
    return final


def parse_gmp_trend(driver, url):
    driver.get(url)
    time.sleep(4)

    soup = BeautifulSoup(driver.page_source, "lxml")
    table = soup.find("table")
    if not table:
        return []

    rows = []
    for tr in table.select("tbody tr"):
        tds = tr.find_all("td")
        if len(tds) < 8:
            continue

        rows.append({
            "gmp_date": tds[0].get_text(strip=True),
            "ipo_price": tds[1].get_text(strip=True),
            "gmp": tds[2].get_text(" ", strip=True),
            "subscription": tds[3].get_text(strip=True),
            "sub2_sauda": tds[4].get_text(strip=True),
            "estimated_listing_price": tds[5].get_text(" ", strip=True),
            "estimated_profit": tds[6].get_text(strip=True),
            "last_updated": tds[7].get_text(strip=True),
        })

    return rows


def main():
    if not client:
        print("Aborting due to no DB connection")
        return

    ipos = fetch_api_data()
    driver = setup_driver()

    for i, ipo in enumerate(ipos, 1):
        print(f"[{i}/{len(ipos)}] {ipo['name']}")

        try:
            trend = parse_gmp_trend(driver, ipo["gmp_url"])

            update = {
                "ipo_name": ipo["name"],
                "status": ipo.get("status"),
                "values.gmp": ipo.get("gmp"),
                "values.subscription": ipo.get("subscription"),
                "values.ipo_price": ipo.get("ipo_price"),
                "values.investorgain_url": ipo["gmp_url"],
                "values.gmp_trend": trend,
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }

            collection.update_one(
                {"ipo_name": ipo["name"]},
                {"$set": update},
                upsert=True
            )

            print("   ✅ Updated")

        except Exception as e:
            print(f"   ❌ {e}")

    driver.quit()
    print("✅ InvestorGain Scraper finished.")


if __name__ == "__main__":
    main()
