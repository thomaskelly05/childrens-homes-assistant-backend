from __future__ import annotations

import re
from typing import Any

UK_POSTCODE_PREFIX_RE = re.compile(r"\b([A-Z]{1,2}\d{1,2}[A-Z]?)\b", re.IGNORECASE)
UK_FULL_POSTCODE_RE = re.compile(r"\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b", re.IGNORECASE)

UK_CONTEXTUAL_LOCATION_TYPES = {
    "station": ["station", "train", "rail", "metro", "tube", "platform"],
    "bus_interchange": ["bus station", "bus stop", "interchange"],
    "hotel": ["hotel", "travelodge", "premier inn", "airbnb", "bnb"],
    "retail_park": ["retail park", "shopping centre", "mall", "centre", "metrocentre"],
    "park": ["park", "field", "woods", "woodland", "beach"],
    "takeaway": ["takeaway", "mcdonald", "kfc", "burger", "chicken shop"],
    "taxi_rank": ["taxi", "uber", "bolt", "rank"],
}

UK_REGION_HINTS = {
    "NE": "North East England",
    "SR": "North East England",
    "DH": "North East England",
    "DL": "North East England",
    "TS": "North East England",
    "CA": "North West England",
    "LA": "North West England",
    "L": "North West England",
    "M": "North West England",
    "BL": "North West England",
    "OL": "North West England",
    "BB": "North West England",
    "FY": "North West England",
    "PR": "North West England",
    "WN": "North West England",
    "WA": "North West England",
    "CH": "North West England",
    "YO": "Yorkshire and the Humber",
    "HG": "Yorkshire and the Humber",
    "BD": "Yorkshire and the Humber",
    "LS": "Yorkshire and the Humber",
    "WF": "Yorkshire and the Humber",
    "HD": "Yorkshire and the Humber",
    "HX": "Yorkshire and the Humber",
    "S": "Yorkshire and the Humber",
    "DN": "Yorkshire and the Humber",
    "HU": "Yorkshire and the Humber",
    "NG": "East Midlands",
    "DE": "East Midlands",
    "LE": "East Midlands",
    "LN": "East Midlands",
    "PE": "East of England",
    "NR": "East of England",
    "IP": "East of England",
    "CB": "East of England",
    "CO": "East of England",
    "CM": "East of England",
    "SS": "East of England",
    "LU": "East of England",
    "AL": "East of England",
    "SG": "East of England",
    "B": "West Midlands",
    "CV": "West Midlands",
    "DY": "West Midlands",
    "HR": "West Midlands",
    "ST": "West Midlands",
    "TF": "West Midlands",
    "WR": "West Midlands",
    "WS": "West Midlands",
    "WV": "West Midlands",
    "GL": "South West England",
    "BS": "South West England",
    "BA": "South West England",
    "SN": "South West England",
    "TA": "South West England",
    "EX": "South West England",
    "TQ": "South West England",
    "PL": "South West England",
    "TR": "South West England",
    "BH": "South West England",
    "DT": "South West England",
    "SP": "South West England",
    "SO": "South East England",
    "PO": "South East England",
    "GU": "South East England",
    "RH": "South East England",
    "BN": "South East England",
    "TN": "South East England",
    "ME": "South East England",
    "CT": "South East England",
    "OX": "South East England",
    "RG": "South East England",
    "MK": "South East England",
    "HP": "South East England",
    "SL": "South East England",
    "E": "London",
    "EC": "London",
    "N": "London",
    "NW": "London",
    "SE": "London",
    "SW": "London",
    "W": "London",
    "WC": "London",
    "BR": "London",
    "CR": "London",
    "DA": "London",
    "EN": "London",
    "HA": "London",
    "IG": "London",
    "KT": "London",
    "RM": "London",
    "SM": "London",
    "TW": "London",
    "UB": "London",
    "WD": "London",
    "CF": "Wales",
    "LD": "Wales",
    "LL": "Wales",
    "NP": "Wales",
    "SA": "Wales",
    "SY": "Wales",
    "AB": "Scotland",
    "DD": "Scotland",
    "DG": "Scotland",
    "EH": "Scotland",
    "FK": "Scotland",
    "G": "Scotland",
    "HS": "Scotland",
    "IV": "Scotland",
    "KA": "Scotland",
    "KW": "Scotland",
    "KY": "Scotland",
    "ML": "Scotland",
    "PA": "Scotland",
    "PH": "Scotland",
    "TD": "Scotland",
    "ZE": "Scotland",
    "BT": "Northern Ireland",
}


class ISNUKLocationService:
    """UK-bound location normalisation for contextual safeguarding intelligence."""

    def normalise_location(self, *, location_text: str | None = None, postcode_prefix: str | None = None) -> dict[str, Any]:
        raw = " ".join(part for part in [location_text, postcode_prefix] if part).strip()
        full_postcode = self.extract_full_postcode(raw)
        outward_code = self.extract_outward_code(raw) or self.clean_outward_code(postcode_prefix)
        area_code = self.area_code(outward_code)
        return {
            "country": "UK",
            "location_text": location_text,
            "full_postcode": full_postcode,
            "postcode_prefix": outward_code,
            "postcode_area": area_code,
            "region_hint": UK_REGION_HINTS.get(area_code),
            "contextual_location_type": self.contextual_location_type(location_text),
            "precision": "postcode" if full_postcode else "outward_code" if outward_code else "text",
        }

    def extract_full_postcode(self, value: str | None) -> str | None:
        if not value:
            return None
        match = UK_FULL_POSTCODE_RE.search(value.upper())
        if not match:
            return None
        code = match.group(1).replace(" ", "")
        return f"{code[:-3]} {code[-3:]}"

    def extract_outward_code(self, value: str | None) -> str | None:
        if not value:
            return None
        full = self.extract_full_postcode(value)
        if full:
            return full.split()[0]
        match = UK_POSTCODE_PREFIX_RE.search(value.upper())
        return match.group(1).upper() if match else None

    def clean_outward_code(self, value: str | None) -> str | None:
        if not value:
            return None
        cleaned = str(value).strip().upper().replace(" ", "")
        return cleaned or None

    def area_code(self, outward_code: str | None) -> str | None:
        if not outward_code:
            return None
        match = re.match(r"^[A-Z]{1,2}", outward_code.upper())
        return match.group(0) if match else None

    def contextual_location_type(self, location_text: str | None) -> str | None:
        if not location_text:
            return None
        lowered = location_text.lower()
        for location_type, terms in UK_CONTEXTUAL_LOCATION_TYPES.items():
            if any(term in lowered for term in terms):
                return location_type
        return None


isn_uk_location_service = ISNUKLocationService()
