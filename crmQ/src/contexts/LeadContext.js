"use client";
import React, { createContext, useContext, useState } from 'react';

const LeadContext = createContext();

export const LeadProvider = ({ children }) => {
    // These states are now shared globally between your Sidebar and your Table!
    const [selectedDetailLeadId, setSelectedDetailLeadId] = useState(null);
    const [activeDetailTab, setActiveDetailTab] = useState('Email');

    return (
        <LeadContext.Provider value={{
            selectedDetailLeadId, setSelectedDetailLeadId,
            activeDetailTab, setActiveDetailTab
        }}>
            {children}
        </LeadContext.Provider>
    );
};

export const useLead = () => useContext(LeadContext);