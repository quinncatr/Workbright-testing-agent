// I-9 branch matrix data, derived from the Rails source (config/locales/app/i9.en.yml)
// and verified against the QA DOM via the discovery specs.
//
// Each citizenship enables a different subset of documents. Document numbers are
// sample values that satisfy the per-document input masks (see document_number_formats
// in i9.en.yml). For multi-attachment documents (those with `additional_docs`), `numbers`
// lists one value per attachment page in the order they are presented.

export type Citizenship = 'citizen' | 'noncitizen_national' | 'permanent_resident' | 'alien';
export type ListKey = 'A' | 'B' | 'C';
export type AlienOption = 'arn' | 'i94' | 'passport';

export const CITIZENSHIP_LABELS: Record<Citizenship, string> = {
  citizen: 'A citizen of the United States',
  noncitizen_national: 'A noncitizen national of the United States',
  permanent_resident: 'A lawful permanent resident',
  alien: 'An alien authorized to work',
};

export interface DocSpec {
  key: string;                 // data-key on the .document-option link
  list: ListKey;
  title: string;               // list_title (for labels only; selection is by data-key)
  citizenships: Citizenship[]; // citizenships for which this doc is selectable
  numbers?: string[];          // sample doc number(s), one per attachment page
  multi?: boolean;             // has additional_docs -> multiple upload pages
  requiresArn?: boolean;       // alien must supply an Alien Reg Number in Section 1 (I-766)
}

// ---- List A (identity + work authorization in one document) ----------------
export const LIST_A: DocSpec[] = [
  { key: 'us_passport', list: 'A', title: 'U.S. Passport', citizenships: ['citizen', 'noncitizen_national'], numbers: ['123456789'] },
  { key: 'us_passport_card', list: 'A', title: 'U.S. Passport Card', citizenships: ['citizen', 'noncitizen_national'], numbers: ['123456789'] },
  { key: 'permanent_resident_card', list: 'A', title: 'Permanent Resident Card (Form I-551)', citizenships: ['permanent_resident'], numbers: ['ABC1234567890'] },
  { key: 'alien_registration_receipt_card', list: 'A', title: 'Alien Registration Receipt Card (Form I-551)', citizenships: ['permanent_resident'], numbers: ['ABC1234567890'] },
  { key: 'foreign_passport', list: 'A', title: 'Foreign passport containing temporary I-551 stamp', citizenships: ['permanent_resident'], multi: true, numbers: ['ABC123456789', 'STAMP1234'] },
  { key: 'foreign_passport_mriv', list: 'A', title: 'Foreign passport w/ I-551 MRIV notation', citizenships: ['permanent_resident'], multi: true, numbers: ['ABC123456789', 'MRIV12345'] },
  { key: 'employment_auth_doc', list: 'A', title: 'Employment Authorization Document (Form I-766)', citizenships: ['alien'], numbers: ['ABC1234567890'], requiresArn: true },
  { key: 'foreign_passport_with_i94', list: 'A', title: 'Foreign passport and Form I-94', citizenships: ['alien'], multi: true, numbers: ['ABC123456789', '123456789A1'] },
  { key: 'fsm_passport_with_i94', list: 'A', title: 'FSM passport with Form I-94', citizenships: ['alien'], multi: true, numbers: ['ABC123456789', '123456789A1'] },
  { key: 'rmi_passport_with_i94', list: 'A', title: 'RMI passport with Form I-94', citizenships: ['alien'], multi: true, numbers: ['ABC123456789', '123456789A1'] },
  { key: 'other_acceptable_receipt', list: 'A', title: 'Other Acceptable Receipt', citizenships: ['permanent_resident', 'alien'], numbers: [] },
];

// ---- List B (identity) — every List B doc is valid for all citizenships -----
const ALL: Citizenship[] = ['citizen', 'noncitizen_national', 'permanent_resident', 'alien'];
export const LIST_B: DocSpec[] = [
  { key: 'drivers_license', list: 'B', title: "Driver's license (State/territory)", citizenships: ALL, numbers: ['D1234567'] },
  { key: 'state_id_card', list: 'B', title: 'ID card (State/territory)', citizenships: ALL, numbers: ['S1234567'] },
  { key: 'id_card', list: 'B', title: 'ID card (gov agency)', citizenships: ALL, numbers: ['G1234567'] },
  { key: 'school_id_card', list: 'B', title: 'School ID card', citizenships: ALL, numbers: ['SCH12345'] },
  { key: 'voter_registration_card', list: 'B', title: 'Voter registration card', citizenships: ALL, numbers: ['V1234567'] },
  { key: 'military_card', list: 'B', title: 'U.S. military card', citizenships: ALL, numbers: ['MIL12345'] },
  { key: 'military_draft_record', list: 'B', title: 'U.S. military draft record', citizenships: ALL, numbers: ['DR123456'] },
  { key: 'military_dependent_id_card', list: 'B', title: "Military dependent's ID card", citizenships: ALL, numbers: ['DEP12345'] },
  { key: 'uscgmm_card', list: 'B', title: 'USCG Merchant Mariner Card', citizenships: ALL, numbers: ['CG123456'] },
  { key: 'native_american_tribal_document', list: 'B', title: 'Native American tribal document', citizenships: ALL, numbers: ['NAT12345'] },
  { key: 'canadian_drivers_license', list: 'B', title: 'Canadian driver\'s license', citizenships: ALL, numbers: ['CAN12345'] },
  { key: 'under18_school_report_card', list: 'B', title: 'School record/report card (<18)', citizenships: ALL, numbers: ['SCHREC12'] },
  { key: 'under18_doctor_record', list: 'B', title: 'Clinic/doctor/hospital record (<18)', citizenships: ALL, numbers: ['DOC12345'] },
  { key: 'under18_daycare_record', list: 'B', title: 'Day-care/nursery record (<18)', citizenships: ALL, numbers: ['DAY12345'] },
];

// ---- List C (work authorization) -------------------------------------------
const CIT_NONCIT: Citizenship[] = ['citizen', 'noncitizen_national'];
export const LIST_C: DocSpec[] = [
  { key: 'ssn_card', list: 'C', title: 'Social Security Card', citizenships: ALL, numbers: ['123-45-6789'] },
  { key: 'cert_birth_abroad', list: 'C', title: 'Certification of Birth Abroad (FS-545)', citizenships: CIT_NONCIT, numbers: ['FS545123'] },
  { key: 'cert_report_birth', list: 'C', title: 'Certification of Report of Birth (DS-1350)', citizenships: CIT_NONCIT, numbers: ['DS1350123'] },
  { key: 'cert_consular_report_birth', list: 'C', title: 'Consular Report of Birth Abroad (FS-240)', citizenships: CIT_NONCIT, numbers: ['FS240123'] },
  { key: 'us_birth_certificate', list: 'C', title: 'U.S. birth certificate', citizenships: CIT_NONCIT, numbers: ['BC123456'] },
  { key: 'native_american_tribal_document2', list: 'C', title: 'Native American tribal document', citizenships: ALL, numbers: ['NAT54321'] },
  { key: 'us_citizen_id_card', list: 'C', title: 'U.S. Citizen ID card (Form I-197)', citizenships: CIT_NONCIT, numbers: ['I197123'] },
  { key: 'id_card_resident_citizen', list: 'C', title: 'Resident Citizen ID Card (Form I-179)', citizenships: CIT_NONCIT, numbers: ['I179123'] },
  { key: 'employment_auth_by_dhs', list: 'C', title: 'Employment authorization issued by DHS', citizenships: ALL, numbers: ['DHS12345'] },
];

export const ALL_DOCS: DocSpec[] = [...LIST_A, ...LIST_B, ...LIST_C];

// Stable partner documents (valid for every citizenship) used to satisfy the
// "one List B AND one List C" requirement when exercising the other list.
export const PARTNER_B: DocSpec = LIST_B[0]; // drivers_license
export const PARTNER_C: DocSpec = LIST_C[0]; // ssn_card

// First citizenship a document is valid for — used to pick a concrete path.
export function firstCitizenship(doc: DocSpec): Citizenship {
  return doc.citizenships[0];
}
