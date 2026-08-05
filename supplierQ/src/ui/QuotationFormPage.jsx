"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation"; 
import CreateOrder from "../components/sections/create-order";

// IMPORT ADDED: fetchItemDetails to grab the real master item name
import {
  fetchSupplierRfqs,
  fetchSupplierRfqDetail,
  fetchItemImage,
  fetchPrivateImageBlob,
  fetchItemDetails
} from "../services/supplierMetrics.js"; 
                                                                                          
const resolveImageUrl = (imagePath, apiBase) => {
  if (!imagePath) return 'https://placehold.co/150x150?text=No+Image';
  if (imagePath.startsWith("http")) return imagePath;

  let host = 'https://dashboard.versaq.eu';
  try {
    host = new URL(apiBase || host).origin;
  } catch (e) {
    if (typeof window !== 'undefined') {
      host = window.location.origin;
    }
  }

  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${host}${path}`;
};

export function QuotationFormPage({ apiBase, getAccessToken }) {
  const searchParams = useSearchParams();
  const rfqId = searchParams.get("rfq_id"); 

  const [orderDetailsList, setOrderDetailsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDynamicData = useCallback(async () => {
    setLoading(true);
    try {
      let targetRfqName = rfqId;

      if (!targetRfqName) {
        const listRes = await fetchSupplierRfqs({ apiBase, getAccessToken, limit: 1 });
        if (listRes.data && listRes.data.length > 0) {
          targetRfqName = listRes.data[0].name;
        }
      }

      if (!targetRfqName) {
        setLoading(false);
        return; 
      }

      const detailRes = await fetchSupplierRfqDetail(targetRfqName, { apiBase, getAccessToken });
      const details = detailRes.data;

      if (!details) {
         setLoading(false);
         return;
      }

      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 15);
      const validTillFormatted = validDate.toISOString().split('T')[0];

      const rawAddress = details.billing_address_display || details.billing_address || "";
      const formattedAddress = rawAddress.replace(/<br\s*\/?>/gi, '\n');

      // FIX: Removed "await Promise.all" and "async (item)". We do this synchronously now.
      const mappedItems = (details.items || []).map((item) => {
        let imagePath = item.image;
        const resolvedImage = resolveImageUrl(imagePath, apiBase);
        const isPrivate = imagePath && imagePath.includes('/private/files/');

        const itemName = item.item_name || item.description || "";
        const displayName = itemName && itemName !== item.item_code
          ? `${item.item_code} — ${itemName}`
          : item.item_code;

        return {
          id: item.item_code,
          name: displayName,
          status: 'Pending',
          quantity: item.qty,
          price: {
            regular: Number(item.rate) || Number(item.default_item_price) || 0,
          },
          // If private, show a placeholder temporarily. If public, show immediately.
          images: [{ src: isPrivate ? 'https://placehold.co/150x150?text=Loading...' : resolvedImage }],
          _privateImagePath: isPrivate ? imagePath : null, // Hidden field to trigger background load
          variants: [
            { label: 'UOM', value: item.uom || 'Nos' },
            ...(item.item_group ? [{ label: 'Group', value: item.item_group }] : [])
          ],
          vendor: details.supplier,
          shopSku: item.item_code,
          sellerSku: item.item_code,
        };
      });

      const mappedOrder = {
        id: details.name,
        status: details.status || 'Processing',
        createdAt: details.transaction_date,
        customer: { name: details.company },
        companyAddress: formattedAddress,
        incoterm: details.incoterm || "",
        incotermPlace: details.named_place || "",
        validTill: validTillFormatted,
        payment: {
          subtotal: details.net_total || details.grand_total || 0,
          shippingCost: details.taxes_and_charges || 0,
          discount: details.discount_amount || 0,
          total: details.grand_total || 0,
          status: details.status === 'Completed' ? 'Paid' : 'Unpaid',
        },
        items: mappedItems 
      };

      // 1. RENDER UI IMMEDIATELY 
      setOrderDetailsList([mappedOrder]);
      setLoading(false); 

      // 2. BACKGROUND FETCH PRIVATE IMAGES
      mappedItems.forEach(async (item, index) => {
        if (item._privateImagePath) {
          try {
            const secureBlobUrl = await fetchPrivateImageBlob(item._privateImagePath, { apiBase, getAccessToken });
            if (secureBlobUrl) {
              setOrderDetailsList(prevList => {
                if (!prevList || prevList.length === 0) return prevList;
                const newList = [...prevList];
                const order = { ...newList[0] };
                const newItems = [...order.items];
                
                // Swap the placeholder with the real blob URL once it finishes downloading
                newItems[index] = {
                  ...newItems[index],
                  images: [{ src: secureBlobUrl }]
                };
                
                order.items = newItems;
                newList[0] = order;
                return newList;
              });
            }
          } catch (e) {
            console.error("Failed to load background image for", item.id);
          }
        }
      });

    } catch (error) {
      console.error("Failed to fetch dynamic order data:", error);
      setLoading(false);
    }
  }, [apiBase, getAccessToken, rfqId]);

  useEffect(() => {
    loadDynamicData();
  }, [loadDynamicData]);

  return (
    <CreateOrder 
      orders={orderDetailsList} 
      loading={loading} 
    />
  );
}