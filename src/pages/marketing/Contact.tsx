import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, Phone, MapPin } from "lucide-react";
import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.name || !form.email || !form.message) {
      toast({
        title: "Missing info",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // eslint-disable-next-line no-console
      console.log("Contact form submitted:", form);
      await new Promise((r) => setTimeout(r, 500));
      setSubmitted(true);
      toast({
        title: "Message sent",
        description: "Thanks for reaching out. We'll get back to you shortly.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav variant="light" />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-white border-b border-[#ede5dc]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-[#6d412a]/70 hover:text-[#6d412a] transition mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Back to home
            </Link>
            <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4 tracking-tight">
              Get in touch
            </h1>
            <p className="text-lg text-[#6d412a]/70 max-w-2xl mx-auto leading-relaxed">
              Have questions? We'd love to hear from you.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 bg-[#fdf8f4] border-b border-[#ede5dc]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16">
              {/* Contact Info */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-black mb-8">Contact information</h2>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#6d412a]/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-[#6d412a]" />
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Email</p>
                    <a href="mailto:Hello@Hariet.AI" className="text-[#6d412a] hover:underline">
                      Hello@Hariet.AI
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#6d412a]/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-[#6d412a]" />
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Phone</p>
                    <a href="tel:844-974-6277" className="text-[#6d412a] hover:underline">
                      844-974-6277
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#6d412a]/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-[#6d412a]" />
                  </div>
                  <div>
                    <p className="font-semibold text-black mb-1">Location</p>
                    <p className="text-[#6d412a]">Tampa, FL</p>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-white rounded-3xl border border-[#ede5dc] p-8 shadow-sm h-fit">
                {submitted ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-[#92c216]/15 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-7 h-7 text-[#4a6a0c]" />
                    </div>
                    <h3 className="text-xl font-bold text-black mb-2">Message sent</h3>
                    <p className="text-[#6d412a]/70 mb-6">Thanks for reaching out. We'll get back to you soon.</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSubmitted(false)}
                      className="border-[#6d412a]/25 text-[#6d412a] hover:bg-[#6d412a]/5"
                    >
                      Send another message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium text-black">Full name</Label>
                      <Input
                        id="name"
                        required
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="Your name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-black">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="you@company.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium text-black">Subject</Label>
                      <Input
                        id="subject"
                        value={form.subject}
                        onChange={(e) => update("subject", e.target.value)}
                        placeholder="What this is about"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm font-medium text-black">Message</Label>
                      <Textarea
                        id="message"
                        required
                        rows={5}
                        value={form.message}
                        onChange={(e) => update("message", e.target.value)}
                        placeholder="Tell us what's on your mind..."
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#6d412a] hover:bg-[#5a3422] text-white font-semibold py-6 text-base rounded-xl shadow-sm"
                    >
                      {submitting ? "Sending..." : "Send message"}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
