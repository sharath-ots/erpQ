"use client";
import React, { createContext, useContext, useState } from 'react';

const OpportunityContext = createContext();

export const OpportunityProvider = ({ children }) => {

    const [selectedDetailOpportunityId, setSelectedDetailOpportunityId] = useState(null);
    const [activeDetailTab, setActiveDetailTab] = useState('Email');
    const [opportunityCounts, setOpportunityCounts] = useState({
        all: 0, new: 0, urgent: 0, hot: 0, archived: 0
    });

    return (
        <OpportunityContext.Provider value={{
            selectedDetailOpportunityId, setSelectedDetailOpportunityId,
            activeDetailTab, setActiveDetailTab,
            opportunityCounts, setOpportunityCounts
        }}>
            {children}
        </OpportunityContext.Provider>
    );
};

export const useOpportunity = () => useContext(OpportunityContext);