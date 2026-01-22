import requests
from bs4 import BeautifulSoup
import json
import time
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

BASE_URL = "https://www.sptulsian.com"
ROOT_URL = "https://www.sptulsian.com/f/ipo-analysis"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

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


def get_root_ipos():
    res = requests.get(ROOT_URL, headers=HEADERS, timeout=20)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")

    ipos = []
    cards = soup.find_all("div", class_="listing-article-class")

    for card in cards:
        h2 = card.find("h2")
        if not h2:
            continue

        a = h2.find("a", href=True)
        if not a:
            continue

        ipo_name = a.get_text(strip=True)
        ipo_url = a["href"]
        if ipo_url.startswith("/"):
            ipo_url = BASE_URL + ipo_url

        # Extract Short Description (e.g., "Nothing appealing", "Avoid", "Sahi Hain!", etc.)
        short_description = None
        warning = None
        
        # The structure is: div.article_content_container -> a -> div (image) + div (text)
        container = card.select_one("div.article_content_container")
        if container:
            # Find the text div (it's the one inside 'a' that is NOT 'float-left')
            # Easier way: select divs inside 'a'
            link = container.find("a")
            if link:
                divs = link.find_all("div", recursive=False)
                for div in divs:
                    if "float-left" not in div.get("class", []):
                        # This is likely the text container
                        # Get text, split by lines to isolate the first line (the verdict)
                        lines = [line.strip() for line in div.get_text("\n").split("\n") if line.strip()]
                        if lines:
                            first_line = lines[0]
                            short_description = first_line
                            
                            # Check for warning in the same line
                            if "SME IPO wrongly on Mainboard" in first_line:
                                warning = "SME IPO wrongly on Mainboard"
                        break

        ipos.append({
            "ipo_name": ipo_name,
            "ipo_url": ipo_url,
            "root_warning": warning,
            "short_description": short_description
        })

    return ipos


def get_ipo_detail(ipo):
    res = requests.get(ipo["ipo_url"], headers=HEADERS, timeout=20)
    res.raise_for_status()

    soup = BeautifulSoup(res.text, "html.parser")

    article = soup.select_one("div.card-body.padding-0-xs")

    if not article:
        return {**ipo, "article_html": None, "article_text": None}

    # Extract Image URL (Logo)
    # Strategy 1: og:image
    image_url = soup.find("meta", property="og:image")
    logo_url = image_url["content"] if image_url else None
    
    # Strategy 2: First image in content (as backup or duplicate check)
    # The user wants to remove the image from the content if it matches.
    
    # Locate the main content container
    content_div = article.select_one("div.font-size-13")
    
    if not content_div:
         # Fallback to article if specific div not found
        content_div = article

    # --- Clean HTML DOM ---

    # 1. Remove Footer CTA (Image wrapper with "Members Only")
    for div in content_div.select("div.image-wrapper"):
        div.decompose()

    # 2. Extract and Remove Logo Image from Content
    # If there is an image at the start, it is likely the logo.
    # In the sample, it is <div class="float-left"><img ...></div>
    
    # Try to find the logo image in the content to remove it
    first_img_div = content_div.select_one("div.float-left img")
    if first_img_div:
        # If we didn't find og:image, use this
        if not logo_url:
            logo_url = first_img_div.get("src")
        # Remove the parent div of the image if it only contains the image
        parent_div = first_img_div.find_parent("div", class_="float-left")
        if parent_div:
            parent_div.decompose()
        else:
            first_img_div.decompose()

    # 3. Remove Metadata Headers (IPO Size, Price, GMP, etc.)
    # We remove <p> tags containing specific keywords usually found in the header
    header_keywords = [
        "IPO Size:", "Price band:", "M cap:", "IPO Date:", 
        "Grey Market Premium", "against SEBI guidelines"
    ]
    
    for p in content_div.find_all("p"):
        text_content = p.get_text()
        if any(k in text_content for k in header_keywords):
            p.decompose()

    # 4. Remove Metadata Lists (often following IPO Size/Price)
    # e.g. "By promoter Coal India...", "10% issue reserved..."
    list_keywords = [
        "By promoter", "stake to drop", "issue reserved", 
        "Offer for Sale", "Fresh Issue", "shareholders"
    ]
    for ul in content_div.find_all("ul"):
        text_content = ul.get_text()
        if any(k in text_content for k in list_keywords):
            ul.decompose()

    # Get the cleaned HTML
    # decode_contents() returns the inner HTML string
    cleaned_html = content_div.decode_contents().strip()

    # We also keep the plain text version for summary but prefer HTML for display
    text = content_div.get_text("\n", strip=True)

    return {
        **ipo,
        "article_html": str(article), # Original full HTML
        "clean_analysis_html": cleaned_html, # New cleaned HTML with bold
        "article_text": text,
        "logo_url": logo_url
    }


def main():
    if not client:
        print("Aborting due to no DB connection")
        return

    print("🔍 Fetching IPO list from SP Tulsian...")
    ipos = get_root_ipos()
    print(f"✅ Found {len(ipos)} IPOs")

    for i, ipo in enumerate(ipos, 1):
        print(f"📄 [{i}/{len(ipos)}] {ipo['ipo_name']}")
        try:
            details = get_ipo_detail(ipo)
            
            # Prepare Update
            update_data = {
                "values.expert_summary": details.get("article_text"),
                "values.sptulsian_url": details.get("ipo_url"),
                "raw_html.expert_analysis": details.get("article_html"),
                "raw_html.expert_analysis_clean": details.get("clean_analysis_html"), 
                "values.expert_warning": details.get("root_warning"),
                "values.expert_description": ipo.get("short_description"),
                "values.logo_url": details.get("logo_url")
            }
            
            # Upsert into MongoDB
            # Match by Name
            collection.update_one(
                {"ipo_name": ipo['ipo_name']},
                {"$set": update_data},
                upsert=True
            )
            print(f"   ✅ Updated {ipo['ipo_name']}")
            
            time.sleep(1)
        except Exception as e:
            print("❌ Failed:", ipo["ipo_name"], e)

    print("✅ SP Tulsian Scraper finished.")


if __name__ == "__main__":
    main()
