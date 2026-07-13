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

      const mappedItems = await Promise.all((details.items || []).map(async (item) => {
        let imagePath = item.image;

        // Fetch image path if missing
        if (!imagePath) {
          imagePath = await fetchItemImage(item.item_code, { apiBase, getAccessToken });
        }

        const resolvedImage = resolveImageUrl(imagePath, apiBase);
        let finalImageSrc = resolvedImage;

        // Fetch Private Blob if required
        if (imagePath && imagePath.includes('/private/files/')) {
          const secureBlobUrl = await fetchPrivateImageBlob(imagePath, { apiBase, getAccessToken });
          if (secureBlobUrl) {
            finalImageSrc = secureBlobUrl;
          }
        }

        // FIX: Fetch the actual Item Master document to get the 100% correct name
        const masterItemDetails = await fetchItemDetails(item.item_code, { apiBase, getAccessToken });
        
        // Use the master name, fallback to RFQ item_name, but NEVER fallback to item.name (the hash)
        const itemName = masterItemDetails?.item_name || item.item_name || item.description || "";
        
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
          images: [{ src: finalImageSrc }],
          variants: [
            { label: 'UOM', value: item.uom || 'Nos' },
            ...(item.item_group ? [{ label: 'Group', value: item.item_group }] : [])
          ],
          vendor: details.supplier,
          shopSku: item.item_code,
          sellerSku: item.item_code,
        };
      }));

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

      setOrderDetailsList([mappedOrder]);
    } catch (error) {
      console.error("Failed to fetch dynamic order data:", error);
    } finally {
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