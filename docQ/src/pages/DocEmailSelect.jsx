"use client";

import { Select } from "antd";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

/**
 * Reviewer/approver picker: same-domain ERPNext users + free-typed emails.
 */
export default function DocEmailSelect({
  value,
  onChange,
  placeholder = "Select or type an email",
  style,
  allowClear = true,
  initialUsers = [],
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    const q = search.trim();
    const handle = setTimeout(() => {
      const qs = new URLSearchParams();
      if (q) qs.set("q", q);
      qs.set("limit", "100");
      apiFetch(`${docPath("/org/users")}?${qs}`)
        .then((r) => r.json())
        .then((j) => setUsers(j.users || []))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  const options = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const u of users) {
      const email = String(u.email || "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      list.push({
        value: email,
        label: u.name && u.name !== email ? `${u.name} (${email})` : email,
      });
    }
    const typed = search.trim().toLowerCase();
    if (looksLikeEmail(typed) && !seen.has(typed)) {
      list.unshift({ value: typed, label: `Use ${typed}` });
    }
    return list;
  }, [users, search]);

  return (
    <Select
      showSearch
      allowClear={allowClear}
      value={value || undefined}
      onChange={onChange}
      onSearch={setSearch}
      options={options}
      filterOption={false}
      placeholder={placeholder}
      style={style}
      notFoundContent={
        looksLikeEmail(search)
          ? null
          : "Type a full email address, or search the directory"
      }
    />
  );
}
