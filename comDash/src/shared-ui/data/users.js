import { initialConfig } from "config";

const avatar = (index) => {
  const base = `${initialConfig.assetsDir || ""}/images/avatar/avatar_${index}.webp`;
  // If assetsDir is empty, avoid broken "relative" URLs like "/images/..."
  return base.startsWith("/") ? base : `/${base.replace(/^\/+/, "")}`;
};

export const users = Array.from({ length: 30 }, (_, i) => {
  const id = i + 1;
  return { id, name: `User ${id}`, avatar: avatar(((id - 1) % 10) + 1) };
});

