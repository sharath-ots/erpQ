"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CreateOrder from "../components/sections/create-order/index.jsx"; 

// ADDED Imports for item details and images to match QuotationFormPage
import { 
  fetchSupplierQuotationDetail, 
  updateSupplierQuotation,
  fetchItemImage,
  fetchPrivateImageBlob,
  fetchItemDetails
} from "../services/supplierMetrics.js";

// ADDED: resolveImageUrl function
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

export function QuotationEditPage({ apiBase, getAccessToken }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // FIX: The URL uses ?id=..., not ?name=...
  const name = searchParams.get("id") || searchParams.get("name"); 

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);

  const loadData = useCallback(async () => {
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetchSupplierQuotationDetail(name, { apiBase, getAccessToken });
      const details = res.data;

      // FIX: Added async Promise.all mapping to fetch images and actual item names
      const mappedItems = await Promise.all((details.items || []).map(async (i) => {
        let imagePath = i.image;

        // Fetch image path if missing
        if (!imagePath) {
          imagePath = await fetchItemImage(i.item_code, { apiBase, getAccessToken });
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

        // Fetch the actual Item Master document to get the 100% correct name
        const masterItemDetails = await fetchItemDetails(i.item_code, { apiBase, getAccessToken });
        
        // Use the master name, fallback to Quote item_name
        const itemName = masterItemDetails?.item_name || i.item_name || i.description || "";
        
        const displayName = itemName && itemName !== i.item_code
          ? `${i.item_code} — ${itemName}`
          : i.item_code;

        return {
          id: i.item_code,
          name: displayName,
          quantity: i.qty,
          price: { regular: i.rate },
          images: [{ src: finalImageSrc }],
          variants: [{ label: 'UOM', value: i.uom }]
        };
      }));

      setOrderData({
        id: details.name,
        date: details.transaction_date,
        validTill: details.valid_till,
        quotationNumber: details.quotation_number,
        companyAddress: details.billing_address_display,
        shippingAddress: details.shipping_address_display,
        incoterm: details.incoterm,
        incotermPlace: details.named_place,
        taxCategory: details.tax_category,
        shippingRule: details.shipping_rule,
        terms: details.terms,
        items: mappedItems // Injected the deeply-fetched mappedItems here
      });
    } catch (e) {
      console.error("Failed to load quotation for edit", e);
    } finally {
      setLoading(false);
    }
  }, [name, apiBase, getAccessToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdate = async (payload) => {
    await updateSupplierQuotation(name, payload, { apiBase, getAccessToken });
    router.push('/m/supplierq/list/supplier-quotation');
  };

  // FIX: It's important to prevent the child from rendering until orderData is populated
  // if (loading && name) {
  //   return (
  //     <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'inherit' }}>
  //       Loading Quotation Details...
  //     </div>
  //   );
  // }

  return (
    <CreateOrder 
      order={[orderData]} 
      loading={loading}
      isEditMode={true} 
      onSave={handleUpdate} 
    />
  );
}