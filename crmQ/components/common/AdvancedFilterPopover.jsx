import React, { useState, useMemo } from 'react';
import { Menu, MenuItem, Select, TextField, Button, Stack, Typography, IconButton, Divider, Autocomplete } from '@mui/material';
import IconifyIcon from '@/shared-ui/components/base/IconifyIcon';
import { FILTER_CONDITIONS } from '../../src/helpers/filterUtils';

export default function AdvancedFilterPopover({ anchorEl, onClose, filters, setFilters, fields, rows }) {
    const [newFilter, setNewFilter] = useState({ field: fields[0]?.value || 'id', operator: '=', value: '' });

    const availableOptions = useMemo(() => {
        if (!newFilter.field || !rows || newFilter.operator === 'between') return [];

        // 🚀 FIX: First check if we defined custom options for this field (like Conversion Potential)
        const currentFieldDef = fields.find(f => f.value === newFilter.field);
        if (currentFieldDef && currentFieldDef.options && currentFieldDef.options.length > 0) {
            return currentFieldDef.options; // Use our hardcoded dropdown list
        }

        // Fallback: If no custom options, dynamically pull unique values from the current rows
        const uniqueValues = new Set(rows.map(r => r[newFilter.field]).filter(val => val !== null && val !== undefined && val !== ''));
        return Array.from(uniqueValues).map(String).sort();
    }, [newFilter.field, rows, newFilter.operator, fields]);

    // 🚀 Smart Validation: Checks if the input is valid based on operator
    const isFilterValid = () => {
        if (newFilter.operator === 'is') return true;
        if (newFilter.operator === 'between') {
            return Array.isArray(newFilter.value) && newFilter.value[0] && newFilter.value[1];
        }
        return newFilter.value && String(newFilter.value).trim() !== '';
    };

    const handleAddFilter = () => {
        if (!isFilterValid()) return;
        setFilters([...filters, newFilter]);
        setNewFilter({ ...newFilter, value: newFilter.operator === 'between' ? ['', ''] : '' });
    };

    const handleRemoveFilter = (indexToRemove) => {
        setFilters(filters.filter((_, idx) => idx !== indexToRemove));
    };

    const handleClearAll = () => {
        setFilters([]);
    };

    const handleApplyFilters = () => {
        if (isFilterValid()) {
            setFilters([...filters, newFilter]);
            setNewFilter({ ...newFilter, value: newFilter.operator === 'between' ? ['', ''] : '' });
        }
        onClose();
    };

    return (
        <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={onClose}
            PaperProps={{ sx: { width: 550, p: 2, borderRadius: 2, mt: 1, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' } }}
        >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
                Advanced Filters
            </Typography>

            {/* Active Filters List */}
            {filters.map((flt, idx) => {

                if (Array.isArray(flt)) {
                    return (
                        <Stack key={idx} direction="row" alignItems="center" spacing={1} sx={{ mb: 1, p: 1, bgcolor: 'background.default', borderRadius: 1, border: '1px dashed #fdba74' }}>
                            <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500, fontSize: '0.8rem' }}>
                                {flt.map((subFilter, sIdx) => {
                                    const fieldLabel = fields.find(f => f.value === subFilter.field)?.label || subFilter.field;
                                    const opLabel = FILTER_CONDITIONS.find(o => o.value === subFilter.operator)?.label || subFilter.operator;
                                    const displayValue = Array.isArray(subFilter.value) ? subFilter.value.join(' to ') : subFilter.value;

                                    return (
                                        <span key={sIdx}>
                                            {sIdx > 0 && <strong style={{ color: '#ea580c', margin: '0 8px' }}>OR</strong>}
                                            <strong>{fieldLabel}</strong> {opLabel} <em>"{displayValue}"</em>
                                        </span>
                                    );
                                })}
                            </Typography>
                            <IconButton size="small" onClick={() => handleRemoveFilter(idx)} color="error">
                                <IconifyIcon icon="material-symbols:close" width={16} />
                            </IconButton>
                        </Stack>
                    );
                }

                // Standard Single Filters (Added manually via the Popover)
                const fieldLabel = fields.find(f => f.value === flt.field)?.label || flt.field;
                const opLabel = FILTER_CONDITIONS.find(o => o.value === flt.operator)?.label || flt.operator;
                const displayValue = Array.isArray(flt.value) ? flt.value.join(' to ') : flt.value;

                return (
                    <Stack key={idx} direction="row" alignItems="center" spacing={1} sx={{ mb: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                        <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 500, fontSize: '0.8rem' }}>
                            <strong>{fieldLabel}</strong> {opLabel} <em>"{displayValue}"</em>
                        </Typography>
                        <IconButton size="small" onClick={() => handleRemoveFilter(idx)} color="error">
                            <IconifyIcon icon="material-symbols:close" width={16} />
                        </IconButton>
                    </Stack>
                );
            })}

            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={1} alignItems="center">
                <Select
                    size="small"
                    value={newFilter.field}
                    onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value, value: '' })}
                    sx={{ width: '30%', fontSize: '0.8rem' }}
                >
                    {fields.map(f => <MenuItem key={f.value} value={f.value} sx={{ fontSize: '0.8rem' }}>{f.label}</MenuItem>)}
                </Select>

                <Select
                    size="small"
                    value={newFilter.operator}
                    onChange={(e) => {
                        const op = e.target.value;
                        let defaultVal = '';
                        if (op === 'is') defaultVal = 'set';
                        if (op === 'between') defaultVal = ['', '']; // Initialize array for between
                        setNewFilter({ ...newFilter, operator: op, value: defaultVal });
                    }}
                    sx={{ width: '25%', fontSize: '0.8rem' }}
                >
                    {FILTER_CONDITIONS.map(c => <MenuItem key={c.value} value={c.value} sx={{ fontSize: '0.8rem' }}>{c.label}</MenuItem>)}
                </Select>

                {newFilter.operator === 'is' ? (
                    <Select
                        size="small"
                        value={newFilter.value}
                        onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                        sx={{ flexGrow: 1, fontSize: '0.8rem' }}
                    >
                        <MenuItem value="set">Set</MenuItem>
                        <MenuItem value="not set">Not Set</MenuItem>
                    </Select>
                ) : newFilter.operator === 'between' ? (
                    <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
                        <TextField
                            type="date"
                            size="small"
                            value={Array.isArray(newFilter.value) ? newFilter.value[0] : ''}
                            onChange={(e) => {
                                const val = Array.isArray(newFilter.value) ? [...newFilter.value] : ['', ''];
                                val[0] = e.target.value;
                                setNewFilter({ ...newFilter, value: val });
                            }}
                            sx={{ width: '50%', '& .MuiInputBase-input': { fontSize: '0.8rem', py: 1 } }}
                        />
                        <TextField
                            type="date"
                            size="small"
                            value={Array.isArray(newFilter.value) ? newFilter.value[1] : ''}
                            onChange={(e) => {
                                const val = Array.isArray(newFilter.value) ? [...newFilter.value] : ['', ''];
                                val[1] = e.target.value;
                                setNewFilter({ ...newFilter, value: val });
                            }}
                            sx={{ width: '50%', '& .MuiInputBase-input': { fontSize: '0.8rem', py: 1 } }}
                        />
                    </Stack>
                ) : (
                    <Autocomplete
                        size="small"
                        freeSolo
                        options={availableOptions}
                        value={newFilter.value}
                        onInputChange={(event, newValue) => {
                            setNewFilter({ ...newFilter, value: newValue || '' });
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder={['in', 'not in'].includes(newFilter.operator) ? "comma separated" : "Select or type..."}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleApplyFilters(); }}
                            />
                        )}
                        sx={{ flexGrow: 1, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                    />
                )}
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3 }}>
                <Button size="small" startIcon={<IconifyIcon icon="material-symbols:add" />} onClick={handleAddFilter} disabled={!isFilterValid()}>
                    Add a Filter
                </Button>
                <Stack direction="row" spacing={1}>
                    <Button size="small" color="inherit" onClick={handleClearAll} disabled={filters.length === 0}>
                        Clear Filters
                    </Button>
                    <Button size="small" variant="contained" color="primary" onClick={handleApplyFilters}>
                        Apply Filters
                    </Button>
                </Stack>
            </Stack>
        </Menu>
    );
}