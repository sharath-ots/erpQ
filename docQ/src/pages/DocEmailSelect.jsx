"use client";

import { useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, createFilterOptions, Typography } from "@mui/material";
import { apiFetch } from "../../../comDash/src/lib/apigate";
import { docPath } from "../lib/docQApi";
import StyledTextField from "../../../comDash/src/ui/components/styled/StyledTextField";
import IconifyIcon from "../../../comDash/src/ui/components/base/IconifyIcon";

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

const filter = createFilterOptions();

/**
 * Reviewer/approver picker: same-domain ERPNext users + free-typed emails.
 * Aurora/MUI Implementation using Autocomplete.
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
    if (!q) return;

    const handle = setTimeout(() => {
      const qs = new URLSearchParams();
      qs.set("q", q);
      qs.set("limit", "100");
      apiFetch(`${docPath("/org/users")}?${qs}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.users) {
            // Merge new results with existing initialUsers to prevent list flashing
            setUsers((prev) => {
              const merged = [...prev, ...j.users];
              const unique = Array.from(new Map(merged.map((item) => [item.email, item])).values());
              return unique;
            });
          }
        })
        .catch(() => {});
    }, 300);

    return () => clearTimeout(handle);
  }, [search]);

  // Format options for Autocomplete
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
        name: u.name || "",
      });
    }
    return list;
  }, [users]);

  // Match MUI Autocomplete value format
  const currentValue = useMemo(() => {
    if (!value) return null;
    const existing = options.find((o) => o.value === value);
    if (existing) return existing;
    return { value, label: value }; // Fallback for newly typed freeSolo values
  }, [value, options]);

  return (
    <Autocomplete
      value={currentValue}
      onChange={(event, newValue) => {
        if (typeof newValue === "string") {
          onChange(newValue);
        } else if (newValue && newValue.value) {
          onChange(newValue.value);
        } else {
          onChange(""); // Cleared
        }
      }}
      inputValue={search}
      onInputChange={(event, newInputValue) => {
        setSearch(newInputValue);
      }}
      filterOptions={(options, params) => {
        const filtered = filter(options, params);
        const { inputValue } = params;
        const typed = inputValue.trim().toLowerCase();

        // Suggest the creation of a new value if it looks like an email and isn't in the list
        const isExisting = options.some((option) => option.value === typed);
        if (typed !== "" && looksLikeEmail(typed) && !isExisting) {
          filtered.unshift({
            value: typed,
            label: `Use "${typed}"`,
            isNew: true,
          });
        }
        return filtered;
      }}
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
      freeSolo
      disableClearable={!allowClear}
      options={options}
      getOptionLabel={(option) => {
        if (typeof option === "string") return option;
        if (option.isNew) return option.value;
        return option.label;
      }}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        return (
          <li key={key} {...optionProps}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconifyIcon 
                icon={option.isNew ? "material-symbols:add-circle-outline-rounded" : "material-symbols:person-outline-rounded"} 
                sx={{ color: 'text.secondary', fontSize: 20 }} 
              />
              <Box>
                <Typography variant="body2" fontWeight={option.isNew ? 600 : 400} color={option.isNew ? "primary.main" : "text.primary"}>
                  {option.label}
                </Typography>
              </Box>
            </Box>
          </li>
        );
      }}
      renderInput={(params) => (
        <StyledTextField
          {...params}
          placeholder={placeholder}
          size="small"
          sx={style}
        />
      )}
      noOptionsText={
        looksLikeEmail(search) 
          ? "Press enter to use this email" 
          : "Type a full email address to add it"
      }
    />
  );
}