'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import sitemap from 'routes/sitemap';
import {
  apiFetch,
  displayNameFromEmail,
  getAccessToken,
  parseCityQJwtPayload,
} from '@/lib/apigate';

const ERPUserContext = createContext({
  user: null,
  cityq: null,
  displayName: '',
  displayEmail: '',
  roles: [],
  modules: [],
  loading: true,
});

export const useERPUser = () => useContext(ERPUserContext);

function erpProfileName(erpUser) {
  if (!erpUser) return '';
  if (erpUser.first_name) return String(erpUser.first_name).trim();
  if (erpUser.full_name) return String(erpUser.full_name).trim();
  return '';
}

function emailsMatch(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export const ERPUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [cityq, setCityq] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionData = async () => {
      let cityqSession = parseCityQJwtPayload(getAccessToken());

      try {
        const meRes = await apiFetch('/api/v1/me');
        if (meRes.ok) {
          const me = await meRes.json();
          if (me?.email) {
            cityqSession = {
              sub: me.sub || me.email,
              email: String(me.email).trim().toLowerCase(),
            };
          }
        }

        if (cityqSession?.email) {
          setCityq(cityqSession);
          setDisplayEmail(cityqSession.email);
          setDisplayName(displayNameFromEmail(cityqSession.email));
        }

        const userRes = await fetch('/api/erp-test');
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData?.data) {
            const doc = userData.data;
            if (cityqSession?.email && emailsMatch(doc.email, cityqSession.email)) {
              setUser(doc);
              const erpName = erpProfileName(doc);
              if (erpName) setDisplayName(erpName);
              if (doc.roles) {
                setRoles(doc.roles.map((r) => r.role));
              }
            }
          }
        }

        const sidebarRes = await fetch('/api/erp-sidebar');
        if (sidebarRes.ok) {
          const sidebarData = await sidebarRes.json();
          if (sidebarData?.message) {
            const pages = sidebarData.message.pages || sidebarData.message || [];
            setModules(pages);

            const itemMap = {};
            pages.forEach((page) => {
              const safeName = (page.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
              itemMap[page.name] = {
                name: page.title || page.name,
                path: `#!${safeName}`,
                pathKey: safeName,
                pathName: safeName,
                icon: 'mingcute:folder-open-line',
                active: true,
                items: [],
                parent_page: page.parent_page || null,
              };
            });

            const rootItems = [];
            pages.forEach((page) => {
              const item = itemMap[page.name];
              if (item.parent_page && itemMap[item.parent_page]) {
                itemMap[item.parent_page].items.push(item);
                item.icon = 'mingcute:box-3-line';
              } else {
                rootItems.push(item);
              }
            });

            const cleanEmptyItems = (node) => {
              if (node.items && node.items.length === 0) {
                delete node.items;
              } else if (node.items) {
                node.items.forEach(cleanEmptyItems);
              }
            };
            rootItems.forEach(cleanEmptyItems);

            const existingIndex = sitemap.findIndex((s) => s.id === 'erpnext-modules');
            if (existingIndex !== -1) {
              sitemap[existingIndex].items = rootItems;
            } else if (rootItems.length > 0) {
              sitemap.push({
                id: 'erpnext-modules',
                subheader: 'ERPNext',
                key: 'erpnext',
                icon: 'mingcute:server-line',
                items: rootItems,
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        if (cityqSession?.email) {
          setDisplayEmail(cityqSession.email);
          setDisplayName(displayNameFromEmail(cityqSession.email));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, []);

  return (
    <ERPUserContext.Provider
      value={{ user, cityq, displayName, displayEmail, roles, modules, loading }}
    >
      {children}
    </ERPUserContext.Provider>
  );
};