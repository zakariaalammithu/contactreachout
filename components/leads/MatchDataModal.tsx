'use client';

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, X, Check, Save } from 'lucide-react';
import { suggestColumnMappings, processImportRows } from '@/lib/services/import-service';

export interface MatchDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  headers: string[];
  sampleRows: any[];
  allRawRows: any[];
  onImportSuccess: (importedLeads: any[], listInfo: any) => void;
}

const SYSTEM_FIELDS = [
  { label: '(do not import)', value: 'do_not_import' },
  { label: 'FIRST_NAME', value: 'first_name' },
  { label: 'LAST_NAME', value: 'last_name' },
  { label: 'TITLE', value: 'title' },
  { label: 'COMPANY', value: 'company_name' },
  { label: 'EMAIL', value: 'email' },
  { label: 'PHONE', value: 'phone' },
  { label: 'INDUSTRY', value: 'industry' },
  { label: 'WWW / WEBSITE', value: 'website' },
  { label: 'PERSON_LINKEDIN', value: 'person_linkedin_url' },
  { label: 'COMPANY_LINKEDIN', value: 'company_linkedin_url' },
  { label: 'CITY', value: 'city' },
  { label: 'STATE', value: 'state' },
  { label: 'COUNTRY', value: 'country' },
  { label: 'CUSTOM 1', value: 'custom_1' },
  { label: 'CUSTOM 2', value: 'custom_2' },
  { label: 'CUSTOM 3', value: 'custom_3' },
  { label: 'CUSTOM 4', value: 'custom_4' },
  { label: 'CUSTOM 5', value: 'custom_5' },
  { label: 'CUSTOM 6', value: 'custom_6' },
  { label: 'CUSTOM 7', value: 'custom_7' },
  { label: 'CUSTOM 8', value: 'custom_8' },
  { label: 'CUSTOM 9', value: 'custom_9' },
  { label: 'CUSTOM 10', value: 'custom_10' },
];

export function MatchDataModal({
  isOpen,
  onClose,
  fileName,
  headers,
  sampleRows,
  allRawRows,
  onImportSuccess,
}: MatchDataModalProps) {
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [ignoreFirstRow, setIgnoreFirstRow] = useState(true);
  const [updateExistingCrm, setUpdateExistingCrm] = useState(false);
  const [listName, setListName] = useState('');
  const [folderName, setFolderName] = useState('Default');
  const [selectedTag, setSelectedTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && headers && headers.length > 0) {
      setListName(fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Lead List');
      const suggested = suggestColumnMappings(headers);

      // Map headers to system field value
      const initialMap: Record<string, string> = {};
      headers.forEach((h) => {
        const found = Object.entries(suggested).find(([sysKey, origHeader]) => origHeader === h);
        if (found) {
          initialMap[h] = found[0];
        } else {
          // Custom mapping fallbacks
          const hLower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (hLower.includes('first')) initialMap[h] = 'first_name';
          else if (hLower.includes('last')) initialMap[h] = 'last_name';
          else if (hLower.includes('company')) initialMap[h] = 'company_name';
          else if (hLower.includes('email') || hLower.includes('mail')) initialMap[h] = 'email';
          else if (hLower.includes('title') || hLower.includes('role')) initialMap[h] = 'title';
          else if (hLower.includes('website') || hLower.includes('domain') || hLower.includes('site')) initialMap[h] = 'website';
          else if (hLower.includes('industry')) initialMap[h] = 'industry';
          else if (hLower.includes('city')) initialMap[h] = 'city';
          else if (hLower.includes('state')) initialMap[h] = 'state';
          else if (hLower.includes('country')) initialMap[h] = 'country';
          else if (hLower.includes('phone') || hLower.includes('mobile')) initialMap[h] = 'phone';
          else if (hLower.includes('custom1') || hLower.includes('opening')) initialMap[h] = 'custom_1';
          else if (hLower.includes('custom2') || hLower.includes('problem')) initialMap[h] = 'custom_2';
          else if (hLower.includes('custom3') || hLower.includes('pitch')) initialMap[h] = 'custom_3';
          else if (hLower.includes('custom4') || hLower.includes('cta')) initialMap[h] = 'custom_4';
          else if (hLower.includes('custom5')) initialMap[h] = 'custom_5';
          else if (hLower.includes('custom6')) initialMap[h] = 'custom_6';
          else if (hLower.includes('custom7')) initialMap[h] = 'custom_7';
          else if (hLower.includes('custom8')) initialMap[h] = 'custom_8';
          else if (hLower.includes('custom9')) initialMap[h] = 'custom_9';
          else if (hLower.includes('custom10')) initialMap[h] = 'custom_10';
          else initialMap[h] = 'do_not_import';
        }
      });
      setColumnMappings(initialMap);
    }
  }, [isOpen, headers, fileName]);

  if (!isOpen) return null;

  const handleFieldSelect = (header: string, sysValue: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [header]: sysValue,
    }));
  };

  const handleExecuteImport = () => {
    setIsSubmitting(true);
    try {
      // Re-construct mapping object expected by processImportRows
      const mappingObj: any = {
        first_name: '',
        last_name: '',
        title: '',
        company_name: '',
        email: '',
        industry: '',
        person_linkedin_url: '',
        website: '',
        company_linkedin_url: '',
        city: '',
        state: '',
        country: '',
        phone: '',
        custom_1: '',
        custom_2: '',
        custom_3: '',
        custom_4: '',
        custom_5: '',
        custom_6: '',
        custom_7: '',
        custom_8: '',
        custom_9: '',
        custom_10: '',
      };

      Object.entries(columnMappings).forEach(([header, sysVal]) => {
        if (sysVal && sysVal !== 'do_not_import') {
          mappingObj[sysVal] = header;
        }
      });

      const rowsToProcess = ignoreFirstRow ? allRawRows : allRawRows;
      const result = processImportRows(rowsToProcess, mappingObj);

      const rawRowsToUse = (result.validLeads && result.validLeads.length > 0)
        ? result.validLeads
        : allRawRows;

      const validLeads = rawRowsToUse.map((ld: any, idx: number) => {
        const keys = Object.keys(ld);
        const findVal = (terms: string[]) => {
          for (const k of keys) {
            const kl = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (terms.some((t) => kl.includes(t))) {
              const val = ld[k];
              if (val !== undefined && val !== null && String(val).trim()) {
                return String(val).trim();
              }
            }
          }
          return '';
        };

        const getCustomVal = (sysKey: string) => {
          const mappedHeader = mappingObj[sysKey];
          if (mappedHeader && ld[mappedHeader] !== undefined) {
            return String(ld[mappedHeader]).trim();
          }
          if (ld[sysKey] !== undefined) {
            return String(ld[sysKey]).trim();
          }
          return '';
        };

        const mappedCompanyHeader = mappingObj.company_name;
        const mappedWebsiteHeader = mappingObj.website;
        const mappedEmailHeader = mappingObj.email;
        const mappedFirstHeader = mappingObj.first_name;
        const mappedLastHeader = mappingObj.last_name;

        const company = (mappedCompanyHeader && ld[mappedCompanyHeader])
          ? String(ld[mappedCompanyHeader]).trim()
          : (ld.companyName || ld.company_name || findVal(['company', 'organization', 'business']) || 'Target Lead Account');

        const rawWeb = (mappedWebsiteHeader && ld[mappedWebsiteHeader])
          ? String(ld[mappedWebsiteHeader]).trim()
          : (ld.website || ld.domain || findVal(['website', 'domain', 'url', 'site', 'web']) || '');

        const email = (mappedEmailHeader && ld[mappedEmailHeader])
          ? String(ld[mappedEmailHeader]).trim()
          : (ld.email || findVal(['email', 'mail']) || '');

        const firstName = (mappedFirstHeader && ld[mappedFirstHeader])
          ? String(ld[mappedFirstHeader]).trim()
          : (ld.firstName || ld.first_name || findVal(['first', 'name', 'contact', 'person']) || '');

        const lastName = (mappedLastHeader && ld[mappedLastHeader])
          ? String(ld[mappedLastHeader]).trim()
          : (ld.lastName || ld.last_name || findVal(['last', 'surname']) || '');

        const c1 = getCustomVal('custom_1') || ld.personalized_opening_line || ld.personalizedOpeningLine || findVal(['opening', 'icebreaker']) || '';
        const c2 = getCustomVal('custom_2') || ld.problem_paragraph || ld.problemParagraph || findVal(['problem', 'pain']) || '';
        const c3 = getCustomVal('custom_3') || ld.pitch || findVal(['pitch', 'solution']) || '';
        const c4 = getCustomVal('custom_4') || ld.cta || findVal(['cta', 'action']) || '';
        const c5 = getCustomVal('custom_5');
        const c6 = getCustomVal('custom_6');
        const c7 = getCustomVal('custom_7');
        const c8 = getCustomVal('custom_8');
        const c9 = getCustomVal('custom_9');
        const c10 = getCustomVal('custom_10');

        return {
          id: `lead-${Date.now()}-${idx}`,
          companyName: company,
          company_name: company,
          website: rawWeb,
          domain: rawWeb.replace(/^https?:\/\//i, '').replace(/\/.*$/, ''),
          email: email,
          firstName: firstName,
          first_name: firstName,
          lastName: lastName,
          last_name: lastName,
          phone: ld.phone || findVal(['phone', 'whatsapp', 'mobile', 'tel']) || '',
          title: ld.title || findVal(['title', 'position', 'role']) || '',
          industry: ld.industry || findVal(['industry', 'category']) || 'Services',
          city: ld.city || findVal(['city', 'location']) || '',
          state: ld.state || findVal(['state']) || '',
          country: ld.country || findVal(['country']) || '',
          custom_1: c1,
          custom_2: c2,
          custom_3: c3,
          custom_4: c4,
          custom_5: c5,
          custom_6: c6,
          custom_7: c7,
          custom_8: c8,
          custom_9: c9,
          custom_10: c10,
          personalizedOpeningLine: c1,
          problemParagraph: c2,
          pitch: c3,
          cta: c4,
          tag: selectedTag || '',
          folder: folderName || 'Default',
          status: 'UNCONTACTED',
          sourceFileName: fileName,
          source_file: fileName,
          file_name: fileName,
          listId: listName || 'Default List',
          isNewlyImported: true,
          createdAt: new Date().toISOString(),
        };
      });

      const listInfo = {
        id: `list-${Date.now()}`,
        name: listName || fileName.replace(/\.[^/.]+$/, ''),
        fileName: fileName,
        count: validLeads.length,
        uploadedAt: new Date().toISOString(),
      };

      onImportSuccess(validLeads, listInfo);
      onClose();
    } catch (err: any) {
      alert(`Error processing import: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sample1 = sampleRows[0] || {};
  const sample2 = sampleRows[1] || {};
  const sample3 = sampleRows[2] || {};

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 font-sans flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 shadow-2xs shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Match your data</h1>
              <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                File: {fileName}
              </span>
              <span className="bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                Total Rows: {allRawRows.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review detected columns, match fields, and configure lead import options
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="execute-modal-import-btn"
            onClick={handleExecuteImport}
            disabled={isSubmitting}
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 text-xs font-extrabold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="h-4 w-4 stroke-[2.5]" />
                <span>Save & Import Leads</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer ml-1"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Main Content Canvas */}
      <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-6 bg-white">
        {/* Table Matching Matrix */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-4 px-6 w-1/5">COLUMN</th>
                <th className="py-4 px-6 w-1/4">MATCHED FIELD</th>
                <th className="py-4 px-6 w-1/5">SAMPLE1</th>
                <th className="py-4 px-6 w-1/5">SAMPLE2</th>
                <th className="py-4 px-6 w-1/5">SAMPLE3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-700">
              {headers.map((header) => {
                const val1 = sample1[header] !== undefined ? String(sample1[header]) : '';
                const val2 = sample2[header] !== undefined ? String(sample2[header]) : '';
                const val3 = sample3[header] !== undefined ? String(sample3[header]) : '';
                const currentMappedVal = columnMappings[header] || 'do_not_import';

                // Collect system fields selected in other rows (except do_not_import)
                const usedFieldsInOtherRows = new Set(
                  Object.entries(columnMappings)
                    .filter(([h, val]) => h !== header && val && val !== 'do_not_import')
                    .map(([, val]) => val)
                );

                // Available options: do_not_import + current row's selected value + unselected fields
                const availableFields = SYSTEM_FIELDS.filter(
                  (sf) => sf.value === 'do_not_import' || sf.value === currentMappedVal || !usedFieldsInOtherRows.has(sf.value)
                );

                return (
                  <tr key={header} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900 truncate max-w-[200px]" title={header}>
                      {header}
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={currentMappedVal}
                        onChange={(e) => handleFieldSelect(header, e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 cursor-pointer uppercase shadow-2xs"
                      >
                        {availableFields.map((sf) => (
                          <option key={sf.value} value={sf.value}>
                            {sf.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 px-6 text-slate-600 truncate max-w-[200px]" title={val1}>
                      {val1 || <span className="text-slate-300 italic">-</span>}
                    </td>
                    <td className="py-4 px-6 text-slate-600 truncate max-w-[200px]" title={val2}>
                      {val2 || <span className="text-slate-300 italic">-</span>}
                    </td>
                    <td className="py-4 px-6 text-slate-600 truncate max-w-[200px]" title={val3}>
                      {val3 || <span className="text-slate-300 italic">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Additional Preferences & Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Import Options & Filters</h3>
          
          {/* Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer font-semibold select-none transition-colors">
              <input
                type="checkbox"
                checked={ignoreFirstRow}
                onChange={(e) => setIgnoreFirstRow(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
              />
              <span>Ignore First Row When Importing (Only Select If CSV Has Header Row)</span>
            </label>

            <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer font-semibold select-none transition-colors">
              <input
                type="checkbox"
                checked={updateExistingCrm}
                onChange={(e) => setUpdateExistingCrm(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
              />
              <div>
                <span>Insert If Already Exists In Main CRM Database And Update It</span>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">Only new emails will be added</p>
              </div>
            </label>
          </div>

          {/* List & Tag Custom Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Add To List</label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none shadow-2xs"
                placeholder="e.g. check freeoutreach--CSV.csv"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">In Folder</label>
              <select
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none shadow-2xs cursor-pointer bg-white"
              >
                <option value="Default">Default</option>
                <option value="Cold Outreach Q3">Cold Outreach Q3</option>
                <option value="Apollo Export">Apollo Export</option>
                <option value="LinkedIn Scraped">LinkedIn Scraped</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5">Add Tags To All</label>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:outline-none shadow-2xs cursor-pointer bg-white"
              >
                <option value="">Select tag</option>
                <option value="Verified Lead">Verified Lead</option>
                <option value="High Priority">High Priority</option>
                <option value="Hospitality / Medical">Hospitality / Medical</option>
                <option value="SaaS Prospect">SaaS Prospect</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 pb-12">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-8 py-3 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteImport}
            disabled={isSubmitting}
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-10 py-3 text-xs font-extrabold shadow-lg shadow-blue-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
          >
            {isSubmitting ? (
              <span>Saving & Importing Leads...</span>
            ) : (
              <>
                <Save className="h-4 w-4 stroke-[2.5]" />
                <span>Save & Import Leads</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
