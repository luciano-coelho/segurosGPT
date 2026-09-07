/** Shared across every Quote*Lead request body - same schemas regardless of product line. */

export interface PersonalIdentificationData {
  updateDateTime: string;
  brandName: string;
  civilName: string;
  cpfNumber: string;
  hasBrazilianNationality: boolean;
  companyInfo: { cnpjNumber: string; name: string };
  contact: {
    postalAddresses: Array<{
      address: string;
      townName: string;
      countrySubDivision: string;
      postCode: string;
      country: string;
    }>;
  };
}

export interface PersonalQualificationData {
  updateDateTime: string;
  pepIdentification:
    | "NAO_EXPOSTO"
    | "PESSOA_POLITICAMENTE_EXPOSTA_PPE"
    | "PESSOA_PROXIMA_A_PESSOA_POLITICAMENTE_EXPOSTA_PPEE"
    | "SEM_INFORMACAO";
  lifePensionPlans: string;
}

export interface PersonalComplimentaryInformationData {
  updateDateTime: string;
  startDate: string;
  productsServices: Array<{ contract: string; type: string }>;
}

export interface QuoteCustomer {
  identificationData: PersonalIdentificationData;
  qualificationData: PersonalQualificationData;
  complimentaryInformationData: PersonalComplimentaryInformationData;
}

/** Builds the shared quoteCustomer block for a demo CPF. Real broker-entered customer data plugs in here later. */
export function buildDemoQuoteCustomer(cpf: string, civilName: string): QuoteCustomer {
  const now = new Date().toISOString();
  return {
    identificationData: {
      updateDateTime: now,
      brandName: "SegurosGPT",
      civilName,
      cpfNumber: cpf,
      hasBrazilianNationality: true,
      companyInfo: { cnpjNumber: "00000000000000", name: "N/A" },
      contact: {
        postalAddresses: [
          {
            address: "Av Naburo Ykesaki, 1270",
            townName: "Marília",
            countrySubDivision: "SP",
            postCode: "17500000",
            country: "BRA",
          },
        ],
      },
    },
    qualificationData: {
      updateDateTime: now,
      pepIdentification: "NAO_EXPOSTO",
      lifePensionPlans: "NAO_SE_APLICA",
    },
    complimentaryInformationData: {
      updateDateTime: now,
      startDate: now.slice(0, 10),
      productsServices: [{ contract: "string", type: "MICROSSEGUROS" }],
    },
  };
}
