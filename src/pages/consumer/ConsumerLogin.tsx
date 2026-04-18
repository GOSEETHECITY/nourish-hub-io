import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";
import ConsumerDecorativeBackground from "@/components/consumer/ConsumerDecorativeBackground";

const ConsumerLogin = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
          setError("");
          const errors: { email?: string; password?: string } = {};
          if (!email.trim()) errors.email = "Email is required";
          if (!password) errors.password = "Password is required";
          setFieldErrors(errors);
          if (Object.keys(errors).length > 0) return;

          setLoading(true);
          const { error: authErr } = await supabase.auth.signInWithPassword({
                  email: email.trim(), password
          });
          setLoading(false);

          if (authErr) {
                  setError(authErr.message);
                  return;
          }

          const redirect = sessionStorage.getItem("redirect_after_login");
          if (redirect) {
                  sessionStorage.removeItem("redirect_after_login");
                  navigate(redirect);
          } else {
                  navigate("/app/home");
          }
    };

    return (
          <ConsumerMobileLayout className="flex flex-col items-center justify-center overflow-hidden">
                <ConsumerDecorativeBackground />
                <div className="relative z-10 flex flex-col items-center gap-5 px-8 w-full">
                        <h1 className="text-3xl font-extrabold">
                                  <span className="text-[#F97316]">GO</span>span>{" "}
                                  <span className="text-[#1B2A4A]">See The City</span>span>
                        </h1>h1>
                
                        <div className="w-full">
                                  <input value={email}
                                                onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
                                                type="email" placeholder="you@email.com"
                                                className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] placeholder:text-gray-400" />
                          {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>p>}
                        </div>div>
                
                        <div className="w-full">
                                  <input value={password}
                                                onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
                                                type="password" placeholder="Password"
                                                className="w-full py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#F97316] placeholder:text-gray-400" />
                          {fieldErrors.pa</ConsumerMobileLayout>
