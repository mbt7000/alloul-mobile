import { apiFetch } from "./client";

interface PhoneResponse {
  success: boolean;
  message: string;
}

export async function sendOtp(phone: string): Promise<PhoneResponse> {
  return apiFetch<PhoneResponse>("/phone/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<PhoneResponse> {
  return apiFetch<PhoneResponse>("/phone/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export async function getPhoneStatus(): Promise<PhoneResponse> {
  return apiFetch<PhoneResponse>("/phone/status");
}
