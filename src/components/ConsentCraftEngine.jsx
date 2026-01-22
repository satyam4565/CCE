import React, { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, Info, Loader2, FileText, ChevronDown } from 'lucide-react';


import { APPROVED_PURPOSE_DATA } from '../data/masterDictionary';

const ConsentCraftEngine = () => {
  const [domain, setDomain] = useState('');
  const [purpose, setPurpose] = useState('');
  const [subPurpose, setSubPurpose] = useState('');
  const [availableSubPurposes, setAvailableSubPurposes] = useState([]);
  const [attributes, setAttributes] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availablePurposes, setAvailablePurposes] = useState([]);

  // Get unique domains from the master dictionary
  const availableDomains = [...new Set(APPROVED_PURPOSE_DATA.map(item => item.domain))];

  // Predefined attribute examples for quick testing
  const attributeExamples = {
    "Health": "Name, Age, Email, Phone Number, Health ID, Date of Birth, Social Security Number, Blood Type, Emergency Contact, Address, Insurance Provider, Religion, Ethnicity",

    "Education": "Name, Student ID, Date of Birth, Email, Phone Number, Parent Name, Address, Bank Account Number, Previous School Records, Religion, Nationality, Photo",

    "Transport": "Name, Date of Birth, Address, Phone Number, Email, Photo, Blood Type, Height, Weight, Eye Color, Social Security Number, Bank Account, Previous Violations, Medical History",

    "Agriculture": "Farmer ID, Name, Land Size, Land Location, Crop Type, Irrigation Source, Bank Account, Aadhaar, Mobile Number, Subsidy History",

    "Rural Development": "Name, Household ID, Address, Income Category, Scheme Name, Bank Account, Age, Caste Certificate, Disability Status"
  };

  // Helper function to get sub-purposes from dictionary
  const getSubPurposes = (selectedDomain, selectedPurpose) => {
    const purposeData = APPROVED_PURPOSE_DATA.find(
      item => item.domain === selectedDomain && item.purpose === selectedPurpose
    );
    return purposeData ? purposeData.sub_purposes : [];
  };

  // Handle domain selection
  const handleDomainChange = (selectedDomain) => {
    setDomain(selectedDomain);
    setPurpose('');
    setSubPurpose('');
    setAvailableSubPurposes([]);
    setResult(null);
    setError('');

    // Filter purposes for selected domain using ONLY approved dictionary
    const purposes = APPROVED_PURPOSE_DATA
      .filter(item => item.domain === selectedDomain)
      .map(item => item.purpose);

    setAvailablePurposes(purposes);

    // Auto-populate example attributes
    if (attributeExamples[selectedDomain]) {
      setAttributes(attributeExamples[selectedDomain]);
    }
  };

  // Handle purpose selection
  const handlePurposeChange = (selectedPurpose) => {
    setPurpose(selectedPurpose);
    setSubPurpose('');
    setResult(null);
    setError('');

    // Get sub-purposes ONLY from approved dictionary
    const subPurposes = getSubPurposes(domain, selectedPurpose);
    setAvailableSubPurposes(subPurposes);
  };

  // Handle sub-purpose selection
  const handleSubPurposeChange = (selectedSubPurpose) => {
    setSubPurpose(selectedSubPurpose);
    setError('');
  };

  const analyzeConsent = async () => {
    // Updated validation to include sub-purpose
    if (!domain.trim() || !purpose.trim() || !subPurpose.trim() || !attributes.trim()) {
      if (!domain.trim() || !purpose.trim() || !attributes.trim()) {
        setError('Please fill in all fields');
      } else if (!subPurpose.trim()) {
        setError('Please select a sub-purpose');
      }
      return;
    }

    // Validate that we have sub-purposes from approved dictionary
    if (availableSubPurposes.length === 0) {
      setError('No approved sub-purposes found for this domain and purpose combination');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const attributeList = attributes.split(',').map(a => a.trim()).filter(a => a);

    const systemPrompt = `You are an expert in data privacy, consent management, and regulatory compliance (GDPR, HIPAA, CCPA, FERPA, etc.). Your role is to analyze data collection scenarios and determine which attributes are truly necessary based on data minimization principles.

CRITICAL INSTRUCTION: You must use ONLY the approved sub-purpose provided. Never invent or suggest additional sub-purposes.`;

    // Updated prompt to include the selected sub-purpose
    const userPrompt = `Analyze this data collection scenario using ONLY the approved information below:

**Domain:** ${domain}
**Purpose:** ${purpose}
**Sub-Purpose (ONLY analyze for this specific sub-purpose):** ${subPurpose}

**Available Attributes:** ${attributeList.join(', ')}

Perform a comprehensive analysis and categorize each attribute into:

1. **REQUIRED** - Legally mandated or absolutely essential for the stated purpose and the SPECIFIC sub-purpose: "${subPurpose}"
2. **OPTIONAL** - Useful but not strictly necessary; enhances service but collection is not mandatory
3. **UNNECESSARY** - Should NOT be collected as it violates data minimization principles or is irrelevant to the specific sub-purpose

For each attribute, provide:
- Clear reasoning based on the specific purpose and ONLY the selected sub-purpose: "${subPurpose}"
- Relevant regulations or compliance standards (e.g., GDPR Article 5, HIPAA, etc.)
- Risk assessment if applicable

Think step-by-step:
1. What is the core operational need for this specific sub-purpose: "${subPurpose}"?
2. What regulations apply to this domain?
3. Which attributes are legally required for "${subPurpose}"?
4. Which attributes are operationally essential for "${subPurpose}"?
5. Which attributes exceed data minimization requirements for "${subPurpose}"?

IMPORTANT: Base your analysis ONLY on the selected sub-purpose: "${subPurpose}". Do not reference or consider other sub-purposes.

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "domain": "${domain}",
  "purpose": "${purpose}",
  "sub_purpose": "${subPurpose}",
  "analysis_summary": "Brief overview of key considerations for the sub-purpose",
  "applicable_regulations": ["List of relevant regulations"],
  "required_attributes": [
    {
      "attribute": "attribute name",
      "reason": "detailed justification referencing the specific sub-purpose",
      "regulatory_basis": "specific regulation or principle",
      "risk_level": "low/medium/high"
    }
  ],
  "optional_attributes": [
    {
      "attribute": "attribute name",
      "reason": "detailed justification",
      "benefit": "how it enhances the service",
      "risk_level": "low/medium/high"
    }
  ],
  "unnecessary_attributes": [
    {
      "attribute": "attribute name",
      "reason": "why it should not be collected for this sub-purpose",
      "violation": "what principle it violates",
      "risk_level": "low/medium/high"
    }
  ]
}`;

    try {
      const response = await fetch("http://localhost:4000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          temperature: 0,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt
            }
          ]
        })
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Groq returns OpenAI-style responses
      const content = data.choices[0].message.content;

      // Clean JSON text if wrapped in ```
      let cleanedContent = content.trim()
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '');

      const parsedResult = JSON.parse(cleanedContent);
      setResult(parsedResult);

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to analyze consent requirements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'text-green-300 bg-green-500/20';
      case 'medium': return 'text-amber-300 bg-amber-500/20';
      case 'high': return 'text-red-300 bg-red-500/20';
      default: return 'text-slate-300 bg-slate-500/20';
    }
  };

  return (
    <section aria-label="Consent analysis workspace" className="space-y-6">
      {/* Context strip */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 px-5 py-4 shadow-lg shadow-slate-950/60 backdrop-blur">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-300">
              Analysis setup
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-50 sm:text-2xl">
              Configure your consent scenario
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-400">
              Select a regulated domain, narrow down to an approved sub-purpose, then list the attributes you
              intend to collect. The engine will classify each attribute against data minimization principles.
            </p>
          </div>
          <div className="flex w-full flex-col items-start gap-2 text-xs text-slate-400 sm:w-auto sm:items-end">
            {domain && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span className="font-medium text-slate-200">Domain:</span>
                <span className="font-medium text-slate-400">{domain}</span>
              </span>
            )}
            {purpose && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span className="font-medium text-slate-200">Purpose:</span>
                <span className="font-medium text-slate-400">{purpose}</span>
              </span>
            )}
            {subPurpose && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span className="font-medium text-slate-200">Sub-purpose:</span>
                <span className="line-clamp-1 max-w-[200px] text-left font-medium text-slate-400 sm:max-w-xs sm:text-right">
                  {subPurpose}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        {/* Left: configuration form */}
        <div className="space-y-6">
          {/* Use-case definition card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/60 backdrop-blur-sm animate-fadeIn">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  Use-case definition
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-50">
                  Domain, purpose &amp; approved sub-purpose
                </h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Start by narrowing the analysis context. Approved purposes and sub-purposes are driven solely
                  by your internal master dictionary.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-700/80">
                <FileText className="h-3.5 w-3.5 text-slate-300" />
                Single sub-purpose per run
              </div>
            </div>

            <div className="space-y-4">
              {/* Domain */}
              <div className="animate-slideUp delay-100">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Domain
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Choose the regulatory context your service operates in. This controls the available purposes and
                  example attributes.
                </p>
                <div className="relative">
                  <select
                    value={domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3.5 pr-10 text-sm text-slate-50 shadow-sm shadow-slate-950/40 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/60 hover:border-slate-600/80 cursor-pointer appearance-none"
                  >
                    <option value="">Select a domain...</option>
                    {availableDomains.map((dom, idx) => (
                      <option key={idx} value={dom}>
                        {dom}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    size={20}
                  />
                </div>
              </div>

              {/* Purpose */}
              <div className="animate-slideUp delay-200">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Purpose
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Filter down to the specific business purpose from your approved catalogue for the chosen domain.
                </p>
                {availablePurposes.length === 0 ? (
                  <div className="w-full rounded-xl border border-dashed border-slate-800 bg-slate-900/60 px-4 py-3.5 text-sm italic text-slate-500">
                    {domain ? 'Not available for this domain.' : 'Select a domain to see its approved purposes.'}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={purpose}
                      onChange={(e) => handlePurposeChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3.5 pr-10 text-sm text-slate-50 shadow-sm shadow-slate-950/40 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/60 hover:border-slate-600/80 cursor-pointer appearance-none"
                    >
                      <option value="">Select a purpose...</option>
                      {availablePurposes.map((purp, idx) => (
                        <option key={idx} value={purp}>
                          {purp}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      size={20}
                    />
                  </div>
                )}
              </div>

              {/* Sub-purpose */}
              <div className="animate-slideUp delay-250">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                  Sub-purpose
                </label>
                <p className="mb-2 text-xs text-slate-500">
                  Lock the analysis to a single approved sub-purpose. The engine will ignore any other potential
                  sub-purposes for this run.
                </p>
                {availableSubPurposes.length === 0 ? (
                  <div className="w-full rounded-xl border border-dashed border-slate-800 bg-slate-900/60 px-4 py-3.5 text-sm italic text-slate-500">
                    {purpose ? 'No approved sub-purposes for this combination.' : 'Select a purpose to see sub-purposes.'}
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={subPurpose}
                      onChange={(e) => handleSubPurposeChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3.5 pr-10 text-sm text-slate-50 shadow-sm shadow-slate-950/40 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-500/60 hover:border-slate-600/80 cursor-pointer appearance-none"
                    >
                      <option value="">Select a sub-purpose...</option>
                      {availableSubPurposes.map((subPurp, idx) => (
                        <option key={idx} value={subPurp}>
                          {subPurp}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      size={20}
                    />
                  </div>
                )}
                {availableSubPurposes.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-indigo-200">
                    <Info size={14} className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-300" />
                    <span>
                      Select <span className="font-semibold text-slate-100">one</span> sub-purpose per run. Results and
                      recommendations are scoped strictly to that choice.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Attribute definition card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/60 backdrop-blur-sm animate-fadeIn">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  Data attributes
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-50">Attributes you plan to collect</h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Paste or type a comma-separated list. The engine will classify each attribute as required, optional,
                  or unnecessary for the selected sub-purpose.
                </p>
              </div>
            </div>
            <div className="animate-slideUp delay-300">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                Given attributes
              </label>
              <textarea
                value={attributes}
                onChange={(e) => setAttributes(e.target.value)}
                placeholder="e.g., Name, Age, Email, Phone Number, Address, SSN, Health ID"
                rows={5}
                className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3.5 text-sm text-slate-50 shadow-inner shadow-slate-950/40 outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/60 hover:border-slate-600/80"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                <span>Separate attributes with commas. Identifiers, contact details, health, and financial data all supported.</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2 py-1 font-medium text-slate-400 ring-1 ring-slate-700/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Sensitive data is flagged automatically
                </span>
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-900/20 px-4 py-3.5 text-sm text-red-200 shadow-lg shadow-red-950/40 backdrop-blur-sm animate-shake">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" size={20} />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Primary action */}
          <div className="space-y-2">
            <button
              onClick={analyzeConsent}
              disabled={loading || !domain || !purpose || !subPurpose || !attributes}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-500 px-5 py-4 text-sm font-semibold text-slate-50 shadow-xl shadow-purple-900/50 outline-none transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 hover:from-purple-400 hover:via-indigo-400 hover:to-sky-400 focus-visible:ring-2 focus-visible:ring-purple-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" size={24} />
                  <span>Analyzing attributes for selected sub-purpose…</span>
                </>
              ) : (
                <>
                  <span>Analyze consent requirements</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: results panel */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-5 shadow-2xl shadow-slate-950/70 backdrop-blur-sm animate-fadeIn">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Analysis output
                </p>
                <h3 className="mt-1 text-sm font-semibold text-slate-50 sm:text-base">
                  Required vs optional vs unnecessary attributes
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-medium text-slate-400 ring-1 ring-slate-700/80">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                JSON-first output
              </span>
            </div>

            <div className="max-h-[34rem] space-y-4 overflow-y-auto pr-1">
              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-3 animate-pulse">
                  <div className="h-3 w-32 rounded-full bg-slate-800" />
                  <div className="h-3 w-full rounded-full bg-slate-800" />
                  <div className="h-3 w-5/6 rounded-full bg-slate-800" />
                  <div className="mt-4 space-y-2">
                    <div className="h-8 w-40 rounded-full bg-slate-800" />
                    <div className="h-20 w-full rounded-2xl bg-slate-900" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-8 w-44 rounded-full bg-slate-800" />
                    <div className="h-20 w-full rounded-2xl bg-slate-900" />
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && !result && (
                <div className="flex min-h-[11rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/80 px-4 py-6 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/90 shadow-inner shadow-slate-900/90">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-100">No analysis yet</p>
                    <p className="text-xs text-slate-500">
                      Configure a domain, purpose, sub-purpose, and attributes, then run the analysis to see a
                      categorized breakdown here.
                    </p>
                  </div>
                </div>
              )}

              {/* Results */}
              {result && !loading && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/90 p-5 shadow-lg shadow-slate-950/60">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-sky-500/15 p-2.5">
                        <Info className="h-5 w-5 text-sky-300" size={28} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <h4 className="text-sm font-semibold text-sky-100 sm:text-base">Analysis summary</h4>
                        <p className="text-sm leading-relaxed text-slate-200">{result.analysis_summary}</p>
                        {result.sub_purpose && (
                          <div className="mt-3 border-t border-slate-800 pt-3">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Scoped sub-purpose
                            </p>
                            <span className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                              {result.sub_purpose}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {result.applicable_regulations && result.applicable_regulations.length > 0 && (
                      <div className="mt-4 border-t border-slate-800 pt-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Applicable regulations
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.applicable_regulations.map((reg, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-slate-200 hover:border-sky-400/60 hover:text-sky-100"
                            >
                              {reg}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Required Attributes */}
                  {result.required_attributes && result.required_attributes.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-900/40">
                      <div className="flex items-center gap-3 border-b border-emerald-500/30 bg-gradient-to-r from-emerald-900/50 to-emerald-800/40 px-5 py-3.5">
                        <div className="rounded-xl bg-emerald-500/20 p-2">
                          <CheckCircle className="h-5 w-5 text-emerald-300" size={28} />
                        </div>
                        <h4 className="text-sm font-semibold text-emerald-100">
                          Required attributes ({result.required_attributes.length})
                        </h4>
                      </div>
                      <div className="divide-y divide-emerald-800/40">
                        {result.required_attributes.map((attr, idx) => (
                          <div
                            key={idx}
                            className="group px-5 py-4 transition-colors duration-150 hover:bg-emerald-900/30"
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <h5 className="text-sm font-semibold text-slate-50 group-hover:text-emerald-200">
                                {attr.attribute}
                              </h5>
                              <span
                                className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold ${getRiskColor(
                                  attr.risk_level
                                )} border border-current`}
                              >
                                {attr.risk_level?.toUpperCase() || 'N/A'} RISK
                              </span>
                            </div>
                            <p className="mb-3 text-xs leading-relaxed text-slate-200">{attr.reason}</p>
                            <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/40 px-3.5 py-2.5">
                              <p className="text-[11px] text-slate-100">
                                <span className="font-semibold text-emerald-300">Regulatory basis:</span>{' '}
                                {attr.regulatory_basis}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional Attributes */}
                  {result.optional_attributes && result.optional_attributes.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-900/70 shadow-lg shadow-sky-900/40">
                      <div className="flex items-center gap-3 border-b border-sky-500/30 bg-gradient-to-r from-sky-950/60 to-slate-900/80 px-5 py-3.5">
                        <div className="rounded-xl bg-sky-500/20 p-2">
                          <Info className="h-5 w-5 text-sky-300" size={28} />
                        </div>
                        <h4 className="text-sm font-semibold text-sky-100">
                          Optional attributes ({result.optional_attributes.length})
                        </h4>
                      </div>
                      <div className="divide-y divide-sky-900/50">
                        {result.optional_attributes.map((attr, idx) => (
                          <div
                            key={idx}
                            className="group px-5 py-4 transition-colors duration-150 hover:bg-slate-900/80"
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <h5 className="text-sm font-semibold text-slate-50 group-hover:text-sky-200">
                                {attr.attribute}
                              </h5>
                              <span
                                className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold ${getRiskColor(
                                  attr.risk_level
                                )} border border-current`}
                              >
                                {attr.risk_level?.toUpperCase() || 'N/A'} RISK
                              </span>
                            </div>
                            <p className="mb-3 text-xs leading-relaxed text-slate-200">{attr.reason}</p>
                            {attr.benefit && (
                              <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 px-3.5 py-2.5">
                                <p className="text-[11px] text-slate-100">
                                  <span className="font-semibold text-sky-300">Benefit:</span> {attr.benefit}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unnecessary Attributes */}
                  {result.unnecessary_attributes && result.unnecessary_attributes.length > 0 && (
                    <div className="overflow-hidden rounded-2xl border border-red-500/40 bg-slate-950/80 shadow-lg shadow-red-950/50">
                      <div className="flex items-center gap-3 border-b border-red-500/40 bg-gradient-to-r from-red-950/70 to-slate-950 px-5 py-3.5">
                        <div className="rounded-xl bg-red-500/20 p-2">
                          <XCircle className="h-5 w-5 text-red-300" size={28} />
                        </div>
                        <h4 className="text-sm font-semibold text-red-100">
                          Unnecessary attributes ({result.unnecessary_attributes.length})
                        </h4>
                      </div>
                      <div className="divide-y divide-red-900/60">
                        {result.unnecessary_attributes.map((attr, idx) => (
                          <div
                            key={idx}
                            className="group px-5 py-4 transition-colors duration-150 hover:bg-red-950/40"
                          >
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <h5 className="text-sm font-semibold text-slate-50 group-hover:text-red-200">
                                {attr.attribute}
                              </h5>
                              <span
                                className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold ${getRiskColor(
                                  attr.risk_level
                                )} border border-current`}
                              >
                                {attr.risk_level?.toUpperCase() || 'N/A'} RISK
                              </span>
                            </div>
                            <p className="mb-3 text-xs leading-relaxed text-slate-200">{attr.reason}</p>
                            <div className="rounded-xl border border-red-700/60 bg-red-950/50 px-3.5 py-2.5">
                              <p className="text-[11px] text-slate-100">
                                <span className="font-semibold text-red-300">Violation:</span> {attr.violation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ConsentCraftEngine;