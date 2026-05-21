"use client";
import React, { createContext, useContext, useState } from 'react';

const LeadContext = createContext();

export const LeadProvider = ({ children }) => {
    // These states are now shared globally between your Sidebar and your Table!
    const [selectedDetailLeadId, setSelectedDetailLeadId] = useState(null);
    const [activeDetailTab, setActiveDetailTab] = useState('Email');
    const [leadCounts, setLeadCounts] = useState({
        all: 0, new: 0, urgent: 0, hot: 0, archived: 0
    });

    return (
        <LeadContext.Provider value={{
            selectedDetailLeadId, setSelectedDetailLeadId,
            activeDetailTab, setActiveDetailTab,
            leadCounts, setLeadCounts
        }}>
            {children}
        </LeadContext.Provider>
    );
};

export const useLead = () => useContext(LeadContext);