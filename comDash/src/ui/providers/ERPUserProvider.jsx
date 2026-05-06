'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import sitemap from 'routes/sitemap'; // Import the sidebar map so we can inject into it

const ERPUserContext = createContext({ user: null, roles: [], modules: [], loading: true });

export const useERPUser = () => useContext(ERPUserContext);

export const ERPUserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        // 1. Fetch User Profile & Roles
        const userRes = await fetch('/api/erp-test');
        const userData = await userRes.json();
        
        // 2. Fetch the Frappe Workspace Sidebar Tree
        const sidebarRes = await fetch('/api/erp-sidebar');
        const sidebarData = await sidebarRes.json();

        // --- PROCESS USER DETAILS ---
        if (userData && userData.data) {
          setUser(userData.data);
          
          if (userData.data.roles) {
            setRoles(userData.data.roles.map(r => r.role));
          }
        }

        // --- PROCESS SIDEBAR MODULES (PURE TREE ARCHITECTURE) ---
        if (sidebarData && sidebarData.message) {
          const pages = sidebarData.message.pages || sidebarData.message || [];
          setModules(pages);

          // Step A: Initialize every module as a raw node
          const itemMap = {};
          pages.forEach(page => {
             const safeName = (page.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
             itemMap[page.name] = {
                name: page.title || page.name,
                path: `#!${safeName}`, // Placeholder path for now
                pathKey: safeName,
                pathName: safeName, 
                icon: 'mingcute:folder-open-line', // Standard folder icon
                active: true,
                items: [], // Will hold children
                parent_page: page.parent_page || null // The Frappe parent link
             };
          });

          // Step B: Link Children to Parents & Find Root Items
          const rootItems = [];
          pages.forEach(page => {
             const item = itemMap[page.name];
             // If it has a parent, push it into the parent's items
             if (item.parent_page && itemMap[item.parent_page]) {
                itemMap[item.parent_page].items.push(item);
                // Make child items have a slightly different icon for visual hierarchy
                item.icon = 'mingcute:box-3-line'; 
             } else {
                // No parent means it's a Top-Level Root Item!
                rootItems.push(item);
             }
          });

          // Step C: Clean up empty arrays (CRITICAL FIX FOR BROKEN DROPDOWNS)
          // If a module has no children, we must delete the 'items' key completely
          const cleanEmptyItems = (node) => {
             if (node.items && node.items.length === 0) {
                delete node.items; 
             } else if (node.items) {
                node.items.forEach(cleanEmptyItems);
             }
          };
          rootItems.forEach(cleanEmptyItems);

          // Step D: Safely inject the pure tree into the Next.js Sitemap
          const existingIndex = sitemap.findIndex(s => s.id === 'erpnext-modules');
          if (existingIndex !== -1) {
            sitemap[existingIndex].items = rootItems; 
          } else if (rootItems.length > 0) {
            sitemap.push({
               id: 'erpnext-modules',
               subheader: 'ERPNext',
               key: 'erpnext',
               icon: 'mingcute:server-line',
               items: rootItems
            });
          }
        }
      } catch (err) {
        console.error("Failed to load ERP session:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, []);

  return (
    <ERPUserContext.Provider value={{ user, roles, modules, loading }}>
      {children}
    </ERPUserContext.Provider>
  );
};