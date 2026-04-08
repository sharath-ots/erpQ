import { readFile } from "node:fs/promises";
import path from "node:path";

function settingsDir() {
  return path.join(process.cwd(), "settings");
}

async function readJson(file) {
  const full = path.join(settingsDir(), file);
  const raw = await readFile(full, "utf-8");
  return JSON.parse(raw);
}

function envBool(key) {
  const v = process.env[key];
  if (v === undefined) return undefined;
  return v === "1" || v.toLowerCase() === "true";
}

/**
 * Merge file-based JSON with env overrides (CITYQ_MODULE_ERP, CITYQ_MODULE_CRM, CITYQ_MODULE_MESSAGING).
 */
export async function loadEffectiveSettings() {
  const envOverrides = [];
  const files = ["modules.json", "integrations.json", "enterprise-defaults.json"];

  const modulesFile = await readJson("modules.json");
  const integrationsFile = await readJson("integrations.json");
  const enterpriseFile = await readJson("enterprise-defaults.json");

  const modules = { ...modulesFile.modules };
  const erp = envBool("CITYQ_MODULE_ERP");
  const crm = envBool("CITYQ_MODULE_CRM");
  const messaging = envBool("CITYQ_MODULE_MESSAGING");
  if (erp !== undefined) {
    modules.erp = erp;
    envOverrides.push("CITYQ_MODULE_ERP");
  }
  if (crm !== undefined) {
    modules.crm = crm;
    envOverrides.push("CITYQ_MODULE_CRM");
  }
  if (messaging !== undefined) {
    modules.messaging = messaging;
    envOverrides.push("CITYQ_MODULE_MESSAGING");
  }

  const integrations = { ...integrationsFile.integrations };
  const gd = envBool("CITYQ_INTEGRATION_GOOGLE_DRIVE");
  const zh = envBool("CITYQ_INTEGRATION_ZOHO");
  if (gd !== undefined) {
    integrations.googleDrive = gd;
    envOverrides.push("CITYQ_INTEGRATION_GOOGLE_DRIVE");
  }
  if (zh !== undefined) {
    integrations.zoho = zh;
    envOverrides.push("CITYQ_INTEGRATION_ZOHO");
  }

  return {
    version: Math.max(
      modulesFile.version,
      integrationsFile.version,
      enterpriseFile.version,
    ),
    modules,
    integrations,
    enterprise: enterpriseFile,
    sources: { files, envOverrides },
  };
}
