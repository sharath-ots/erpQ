"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CreateOrder from "../components/sections/create-order/index.jsx"; 
import { fetchSupplierQuotationDetail, updateSupplierQuotation } from "../services/supplierMetrics.js";

export function QuotationEditPage({ apiBase, getAccessToken }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = searchParams.get("name"); 

  const [loading, setLoading] = useState(true);
  const [orderData, setOrderData] = useState(null);

  const loadData = useCallback(async () => {
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetchSupplierQuotationDetail(name, { apiBase, getAccessToken });
      const details = res.data;

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
        items: details.items.map(i => ({
             id: i.item_code,
             name: `${i.item_code} — ${i.item_name}`,
             quantity: i.qty,
             price: { regular: i.rate },
             images: [{ src: i.image || '' }],
             variants: [{ label: 'UOM', value: i.uom }]
        }))
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

  if (loading) return <div>Loading...</div>;

  return (
    <CreateOrder 
      order={[orderData]} 
      loading={loading}
      isEditMode={true} 
      onSave={handleUpdate} 
    />
  );
}