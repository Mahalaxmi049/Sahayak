/**
 * Official verified government portals configuration.
 * Sahayak Pass manages assisted access and authorization.
 * Official transactions take place on verified government websites.
 */

export const OFFICIAL_PORTALS = {
  // General core public service portals
  umang: {
    id: 'umang',
    name: 'UMANG',
    url: 'https://web.umang.gov.in/',
    description: 'Unified Mobile Application for New-age Governance',
  },
  digilocker: {
    id: 'digilocker',
    name: 'DigiLocker',
    url: 'https://www.digilocker.gov.in/',
    description: 'National Digital Document Wallet',
  },
  indiaGov: {
    id: 'indiaGov',
    name: 'National Portal of India',
    url: 'https://www.india.gov.in/',
    description: 'Single access point to all Indian government services',
  },

  // Service-specific verified portals
  certificates_documents: {
    id: 'certificates_documents',
    name: 'DigiLocker / State Service Portal',
    url: 'https://www.digilocker.gov.in/',
    description: 'Access and download digitally verified official certificates and identity records.',
  },
  welfare_pensions: {
    id: 'welfare_pensions',
    name: 'NSAP - National Social Assistance Programme',
    url: 'https://nsap.nic.in/',
    description: 'Ministry of Rural Development national pension scheme portal.',
  },
  education_scholarships: {
    id: 'education_scholarships',
    name: 'National Scholarship Portal (NSP)',
    url: 'https://scholarships.gov.in/',
    description: 'Central portal for national and state scholarship applications and disbursement.',
  },
  health_services: {
    id: 'health_services',
    name: 'Ayushman Bharat Digital Mission (ABHA)',
    url: 'https://abdm.gov.in/',
    description: 'Official digital health ID and health service portal.',
  },
  citizen_services: {
    id: 'citizen_services',
    name: 'National Citizen Services (India.gov.in)',
    url: 'https://www.india.gov.in/',
    description: 'Central registry of public citizen utilities, certificates, and grievance redressal.',
  },
};

export function getOfficialPortal(serviceId) {
  return OFFICIAL_PORTALS[serviceId] || OFFICIAL_PORTALS.indiaGov;
}
