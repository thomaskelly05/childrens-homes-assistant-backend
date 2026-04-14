const DEFAULT_OPTIONS = {
  redactDates: true,
  redactEmails: true,
  redactPhones: true,
  redactPostcodes: true,
  redactNumbers: false,
  generaliseDob: true,
  keepMonthYearDates: false,
};

function safeString(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function trimText(value) {
  return safeString(value).trim();
}

function normaliseKey(value) {
  return trimText(value).toLowerCase();
}

function clone(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(clone);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, clone(val)])
    );
  }
  return value;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeDateField(key = "") {
  const k = normaliseKey(key);
  return (
    k.includes("date") ||
    k.includes("dob") ||
    k.includes("birthday") ||
    k.includes("time") ||
    k.includes("datetime") ||
    k.includes("occurred_at") ||
    k.includes("created_at") ||
    k.includes("updated_at") ||
    k.includes("review_at")
  );
}

function looksLikeEmailField(key = "") {
  return normaliseKey(key).includes("email");
}

function looksLikePhoneField(key = "") {
  const k = normaliseKey(key);
  return k.includes("phone") || k.includes("mobile") || k.includes("telephone");
}

function looksLikeAddressField(key = "") {
  const k = normaliseKey(key);
  return (
    k.includes("address") ||
    k.includes("postcode") ||
    k.includes("post_code") ||
    k.includes("location") ||
    k.includes("school") ||
    k.includes("home_name") ||
    k.includes("hospital") ||
    k.includes("gp") ||
    k.includes("clinic")
  );
}

function looksLikeNameField(key = "") {
  const k = normaliseKey(key);
  return (
    k === "name" ||
    k.includes("full_name") ||
    k.includes("preferred_name") ||
    k.includes("first_name") ||
    k.includes("last_name") ||
    k.includes("child_name") ||
    k.includes("young_person_name") ||
    k.includes("staff_name") ||
    k.includes("contact_person") ||
    k.includes("professional_name") ||
    k.includes("supervisor") ||
    k.includes("line_manager") ||
    k.includes("recipient_name")
  );
}

function formatToken(prefix, idLike, counter) {
  if (idLike !== null && idLike !== undefined && idLike !== "") {
    const clean = safeString(idLike).replace(/[^a-zA-Z0-9_-]/g, "");
    if (clean) return `${prefix}_${clean}`;
  }
  return `${prefix}_${String(counter).padStart(3, "0")}`;
}

function createTokenStore() {
  return {
    youngPeople: new Map(),
    staff: new Map(),
    professionals: new Map(),
    organisations: new Map(),
    locations: new Map(),
    misc: new Map(),
    counters: {
      youngPeople: 1,
      staff: 1,
      professionals: 1,
      organisations: 1,
      locations: 1,
      misc: 1,
    },
  };
}

function getOrCreateToken(bucketMap, counters, bucketName, prefix, rawValue, idLike = null) {
  const clean = trimText(rawValue);
  if (!clean) return clean;

  const key = normaliseKey(clean);
  if (bucketMap.has(key)) {
    return bucketMap.get(key);
  }

  const token = formatToken(prefix, idLike, counters[bucketName]);
  counters[bucketName] += 1;
  bucketMap.set(key, token);
  return token;
}

function addKnownEntity(store, type, value, idLike = null) {
  const clean = trimText(value);
  if (!clean) return null;

  if (type === "young_person") {
    return getOrCreateToken(
      store.youngPeople,
      store.counters,
      "youngPeople",
      "YP",
      clean,
      idLike
    );
  }

  if (type === "staff") {
    return getOrCreateToken(
      store.staff,
      store.counters,
      "staff",
      "STAFF",
      clean,
      idLike
    );
  }

  if (type === "professional") {
    return getOrCreateToken(
      store.professionals,
      store.counters,
      "professionals",
      "PRO",
      clean,
      idLike
    );
  }

  if (type === "organisation") {
    return getOrCreateToken(
      store.organisations,
      store.counters,
      "organisations",
      "ORG",
      clean,
      idLike
    );
  }

  if (type === "location") {
    return getOrCreateToken(
      store.locations,
      store.counters,
      "locations",
      "LOC",
      clean,
      idLike
    );
  }

  return getOrCreateToken(
    store.misc,
    store.counters,
    "misc",
    "REF",
    clean,
    idLike
  );
}

function collectKnownEntities(input, store) {
  const walk = (value) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }

    if (!isPlainObject(value)) return;

    const idLike =
      value.id ??
      value.record_id ??
      value.source_id ??
      value.young_person_id ??
      value.staff_id ??
      null;

    if (value.young_person_name) {
      addKnownEntity(store, "young_person", value.young_person_name, idLike);
    }

    if (value.preferred_name) {
      addKnownEntity(store, "young_person", value.preferred_name, idLike);
    }

    if (value.full_name && value.young_person_id) {
      addKnownEntity(store, "young_person", value.full_name, value.young_person_id);
    }

    if (value.full_name && value.staff_id) {
      addKnownEntity(store, "staff", value.full_name, value.staff_id);
    }

    if (value.staff_member) {
      addKnownEntity(store, "staff", value.staff_member, value.staff_id ?? idLike);
    }

    if (value.supervisor) {
      addKnownEntity(store, "staff", value.supervisor, null);
    }

    if (value.line_manager) {
      addKnownEntity(store, "staff", value.line_manager, null);
    }

    if (value.professional_name) {
      addKnownEntity(store, "professional", value.professional_name, null);
    }

    if (value.contact_person) {
      addKnownEntity(store, "professional", value.contact_person, null);
    }

    if (value.recipient_name) {
      addKnownEntity(store, "staff", value.recipient_name, null);
    }

    if (value.organisation) {
      addKnownEntity(store, "organisation", value.organisation, null);
    }

    if (value.home_name) {
      addKnownEntity(store, "location", value.home_name, null);
    }

    if (value.school_name) {
      addKnownEntity(store, "location", value.school_name, null);
    }

    Object.values(value).forEach(walk);
  };

  walk(input);
}

function escapeRegex(text) {
  return safeString(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceWholeText(text, raw, replacement) {
  const clean = trimText(raw);
  if (!clean) return text;

  const pattern = new RegExp(`\\b${escapeRegex(clean)}\\b`, "gi");
  return text.replace(pattern, replacement);
}

function applyEntityReplacement(text, store) {
  let output = safeString(text);

  const groups = [
    store.youngPeople,
    store.staff,
    store.professionals,
    store.organisations,
    store.locations,
    store.misc,
  ];

  groups.forEach((group) => {
    const pairs = [...group.entries()].sort((a, b) => b[0].length - a[0].length);
    pairs.forEach(([raw, token]) => {
      output = replaceWholeText(output, raw, token);
    });
  });

  return output;
}

function redactEmail(text) {
  return safeString(text).replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "[EMAIL]"
  );
}

function redactPhone(text) {
  return safeString(text).replace(
    /(?:(?:\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}|(?:\+44\s?\d{2,4}|\(?0\d{2,4}\)?)\s?\d{3,4}\s?\d{3,4})/g,
    "[PHONE]"
  );
}

function redactPostcode(text) {
  return safeString(text).replace(
    /\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/gi,
    "[POSTCODE]"
  );
}

function redactDates(text, options = {}) {
  let output = safeString(text);

  if (options.keepMonthYearDates) {
    output = output.replace(
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      "[DATE]"
    );
    output = output.replace(
      /\b\d{4}[\/\-]\d{2}[\/\-]\d{2}\b/g,
      "[DATE]"
    );
    return output;
  }

  output = output.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, "[DATE]");
  output = output.replace(/\b\d{4}[\/\-]\d{2}[\/\-]\d{2}\b/g, "[DATE]");
  output = output.replace(
    /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    "[DATE]"
  );
  output = output.replace(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
    "[DATE]"
  );

  return output;
}

function redactNumbers(text) {
  return safeString(text).replace(/\b\d{6,}\b/g, "[NUMBER]");
}

function generaliseDob(value) {
  const raw = trimText(value);
  if (!raw) return raw;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "[DOB]";
  return `DOB_${date.getFullYear()}`;
}

function scrubFreeText(text, store, options = {}) {
  let output = safeString(text);

  output = applyEntityReplacement(output, store);

  if (options.redactEmails) output = redactEmail(output);
  if (options.redactPhones) output = redactPhone(output);
  if (options.redactPostcodes) output = redactPostcode(output);
  if (options.redactDates) output = redactDates(output, options);
  if (options.redactNumbers) output = redactNumbers(output);

  return output;
}

function scrubPrimitiveByKey(key, value, store, options = {}) {
  if (value === null || value === undefined) return value;

  if (typeof value === "number") {
    return options.redactNumbers ? "[NUMBER]" : value;
  }

  if (typeof value !== "string") {
    return value;
  }

  const raw = value;

  if (looksLikeEmailField(key)) return "[EMAIL]";
  if (looksLikePhoneField(key)) return "[PHONE]";
  if (looksLikeAddressField(key)) return "[LOCATION]";
  if (normaliseKey(key).includes("postcode")) return "[POSTCODE]";

  if (normaliseKey(key).includes("dob") && options.generaliseDob) {
    return generaliseDob(raw);
  }

  if (looksLikeDateField(key) && options.redactDates) {
    return "[DATE]";
  }

  if (looksLikeNameField(key)) {
    const known =
      store.youngPeople.get(normaliseKey(raw)) ||
      store.staff.get(normaliseKey(raw)) ||
      store.professionals.get(normaliseKey(raw)) ||
      store.organisations.get(normaliseKey(raw)) ||
      store.locations.get(normaliseKey(raw));

    if (known) return known;
  }

  return scrubFreeText(raw, store, options);
}

function scrubObject(input, store, options = {}) {
  if (Array.isArray(input)) {
    return input.map((item) => scrubObject(item, store, options));
  }

  if (!isPlainObject(input)) {
    return input;
  }

  const output = {};

  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      output[key] = value.map((item) => scrubObject(item, store, options));
      return;
    }

    if (isPlainObject(value)) {
      output[key] = scrubObject(value, store, options);
      return;
    }

    output[key] = scrubPrimitiveByKey(key, value, store, options);
  });

  return output;
}

function buildReverseMap(store) {
  const reverse = {};

  const add = (group) => {
    [...group.entries()].forEach(([raw, token]) => {
      reverse[token] = raw;
    });
  };

  add(store.youngPeople);
  add(store.staff);
  add(store.professionals);
  add(store.organisations);
  add(store.locations);
  add(store.misc);

  return reverse;
}

export function createScrubber(customOptions = {}) {
  const options = {
    ...DEFAULT_OPTIONS,
    ...(customOptions || {}),
  };

  const store = createTokenStore();

  return {
    options,
    store,

    registerEntity(type, value, idLike = null) {
      return addKnownEntity(store, type, value, idLike);
    },

    registerContext(context = {}) {
      collectKnownEntities(context, store);
      return this;
    },

    scrubText(text = "") {
      return scrubFreeText(text, store, options);
    },

    scrubRecord(record = {}) {
      collectKnownEntities(record, store);
      return scrubObject(record, store, options);
    },

    scrubPayload(payload = {}) {
      collectKnownEntities(payload, store);
      return scrubObject(payload, store, options);
    },

    reverseMap() {
      return buildReverseMap(store);
    },
  };
}

export function scrubAssistantPayload(payload = {}, options = {}) {
  const scrubber = createScrubber(options);
  scrubber.registerContext(payload?.context || {});
  const safePayload = scrubber.scrubPayload(payload);

  return {
    safePayload,
    reverseMap: scrubber.reverseMap(),
  };
}

export function restoreTokens(text = "", reverseMap = {}) {
  let output = safeString(text);

  Object.entries(reverseMap || {}).forEach(([token, raw]) => {
    output = output.replaceAll(token, raw);
  });

  return output;
}
