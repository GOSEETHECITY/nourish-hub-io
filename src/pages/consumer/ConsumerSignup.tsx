import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useConsumerAuth } from "@/contexts/ConsumerAuthContext";
import ConsumerMobileLayout from "@/components/consumer/ConsumerMobileLayout";

const ConsumerSignup = () => {
    const navigate = useNavigate();
    const { refreshConsumer } = useConsumerAuth();
    const phone = sessionStorage.getItem("signup_phone") || "";
    const inviteCode = sessionStorage.getItem("invite_code") || "";

    const [form, setForm] = useState({
          firstName: "", lastName: "", email: "", password: "",
          phone, zip: "", city: "", dob: ""
    });
    const [showPw, setShowPw] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

    const getFriendlyError = (msg: string) => {
          if (msg.includes("rate limit") || msg.includes("email rate")) return "Too many attempts. Please wait a few minutes or use a different email.";
          if (msg.includes("already registered") || msg.includes("already been registered")) return "An account with this email already exists. Please login instead.";
          if (msg.includes("password") && msg.includes("6")) return "Your password must be at least 6 characters long.";
          if (msg.includes("permission denied")) return "Account created. Please log in to continue.";
          if (msg.includes("Invalid email")) return "Please enter a valid email address.";
          return msg;
    };

    const handleSubmit = async () => {
         
