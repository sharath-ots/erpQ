"use client";

import { Icon } from "@iconify/react";

export default function IconifyIcon({ icon, ...rest }) {
  return <Icon icon={icon} {...rest} />;
}

