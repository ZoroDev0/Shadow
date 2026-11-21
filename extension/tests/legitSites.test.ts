/* False-positive guard: popular legitimate sites must never be blocked.
   A "block" here means the user is stopped from opening a real site, which is
   the most expensive mistake this extension can make. */

import { describe, expect, it } from "vitest";
import { analyzeLink } from "../../src/detection/engine";
import { evaluateUrl } from "../src/policy";

export const LEGIT_SITES = [
  // search, video, mail
  "https://www.google.com/search?q=ifsc",
  "https://www.google.co.in/",
  "https://mail.google.com/",
  "https://www.youtube.com/watch?v=abc",
  "https://outlook.live.com/mail/",
  // shopping
  "https://www.amazon.in/gp/orders",
  "https://www.amazon.com/",
  "https://www.amazon.co.uk/",
  "https://www.flipkart.com/",
  "https://www.myntra.com/",
  "https://www.meesho.com/",
  "https://www.jiomart.com/",
  "https://www.ekart.com/",
  // food and travel
  "https://www.swiggy.com/",
  "https://www.zomato.com/",
  "https://www.irctc.co.in/nget/train-search",
  "https://www.parivahan.gov.in/",
  "https://www.delhivery.com/",
  "https://www.bluedart.com/",
  "https://www.olacabs.com/",
  "https://www.uber.com/in/en/",
  // banks and payments
  "https://www.hdfcbank.com/",
  "https://netbanking.hdfcbank.com/",
  "https://onlinesbi.sbi/",
  "https://sbi.co.in/web/personal-banking",
  "https://www.icicibank.com/",
  "https://www.axisbank.com/",
  "https://www.pnbindia.in/",
  "https://www.bankofbaroda.co.in/",
  "https://www.canarabank.com/",
  "https://www.kotak.com/",
  "https://www.sbicard.com/",
  "https://www.paytm.com/",
  "https://www.phonepe.com/",
  "https://pay.google.com/",
  "https://www.npci.org.in/",
  "https://www.amazonpay.in/",
  // government
  "https://www.india.gov.in/",
  "https://www.mygov.in/",
  "https://www.rbi.org.in/",
  "https://www.uidai.gov.in/",
  "https://www.incometax.gov.in/",
  "https://www.gst.gov.in/",
  "https://www.cybercrime.gov.in/",
  "https://www.indiapost.gov.in/",
  "https://www.trai.gov.in/",
  "https://www.digilocker.gov.in/",
  "https://www.nic.in/",
  "https://swayam.gov.in/",
  "https://www.cbse.gov.in/",
  // utilities
  "https://www.mahadiscom.in/",
  "https://www.bsesdelhi.com/",
  "https://www.bescom.org/",
  "https://www.tatapower.com/",
  "https://www.airtel.in/",
  "https://www.jio.com/",
  // news
  "https://timesofindia.indiatimes.com/",
  "https://www.ndtv.com/",
  "https://www.thehindu.com/",
  "https://www.indianexpress.com/",
  "https://www.bbc.com/news",
  // education
  "https://www.nptel.ac.in/",
  "https://www.iitb.ac.in/",
  "https://www.iitd.ac.in/",
  "https://www.ugc.ac.in/",
  "https://www.ncert.nic.in/",
  // reference, work, social
  "https://www.wikipedia.org/",
  "https://github.com/",
  "https://www.microsoft.com/",
  "https://www.apple.com/in/",
  "https://www.netflix.com/in/",
  "https://www.linkedin.com/feed/",
  "https://www.instagram.com/",
  "https://web.whatsapp.com/",
  "https://zoom.us/j/123",
  "https://meet.google.com/abc-defg-hij",
  "https://vercel.com/dashboard",
  // finance and insurance
  "https://www.zerodha.com/",
  "https://www.groww.in/",
  "https://www.policybazaar.com/",
  "https://www.licindia.in/",
  "https://www.acko.com/"
];

describe("popular legitimate sites", () => {
  it(`has at least 40 sites (${LEGIT_SITES.length})`, () => {
    expect(LEGIT_SITES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(LEGIT_SITES).size).toBe(LEGIT_SITES.length);
  });

  it("never blocks one of them", () => {
    const blocked = LEGIT_SITES.filter((url) => evaluateUrl(url).action === "block");
    expect(blocked).toEqual([]);
  });

  it("never marks one of them as a scam link at the link level", () => {
    const scam = LEGIT_SITES.filter((url) => analyzeLink(url).verdict === "scam");
    expect(scam).toEqual([]);
  });

  it("still blocks the lookalike version of a guarded brand", () => {
    expect(evaluateUrl("https://hdfcbank-kyc-verify.top/login").action).toBe("block");
    expect(evaluateUrl("https://amazon-billing.com/pay").action).toBe("block");
  });
});
