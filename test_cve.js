const NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const API_KEY = 

async function getCvesByCpe(cpeId){
    if(cpeId == null){
        throw new Error("Cpe ID is null");
    }

    const collected = []

    const url = new URL(NVD_BASE);
    url.searchParams.set("cpeId", cpeId)
    url.searchParams.set("startIndex", String(0));
    if (apiKey) url.searchParams.set("apiKey", apiKey);
}

async function test() {

    const dummyCpe = "cpe:2.3:a:apache:log4j:2.14.1:*:*:*:*:*:*:*";
    const results = await getCvesByCpe