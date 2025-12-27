import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentSuccess = ({ auth }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [paymentData, setPaymentData] = useState(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 2000;

    const pollPaymentStatus = async () => {
      if (attempts >= maxAttempts) {
        setStatus("timeout");
        return;
      }

      try {
        const response = await fetch(`${API}/payments/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          setPaymentData(data);

          if (data.payment_status === "paid") {
            setStatus("success");
            return;
          } else if (data.status === "expired") {
            setStatus("expired");
            return;
          }
        }

        attempts++;
        setTimeout(pollPaymentStatus, pollInterval);
      } catch (error) {
        console.error("Error checking payment status:", error);
        attempts++;
        setTimeout(pollPaymentStatus, pollInterval);
      }
    };

    pollPaymentStatus();
  }, [sessionId, auth.token]);

  return (
    <Layout auth={auth}>
      <div className="min-h-screen flex items-center justify-center py-12">
        <Card className="w-full max-w-md bg-card border-white/10" data-testid="payment-status-card">
          <CardContent className="p-8 text-center">
            {status === "loading" && (
              <>
                <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
                <h2 className="font-heading text-2xl font-bold mb-2">Processing Payment</h2>
                <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />
                <h2 className="font-heading text-2xl font-bold mb-2">Payment Successful!</h2>
                <p className="text-muted-foreground mb-6">
                  Your enrollment has been confirmed. You can now access your course.
                </p>
                {paymentData && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Amount Paid</span>
                      <span className="font-semibold">
                        ${(paymentData.amount_total / 100).toFixed(2)} {paymentData.currency?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
                <Button 
                  className="w-full btn-glow" 
                  onClick={() => navigate("/dashboard")}
                  data-testid="go-to-dashboard-btn"
                >
                  Go to Dashboard
                </Button>
              </>
            )}

            {(status === "error" || status === "expired" || status === "timeout") && (
              <>
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-6" />
                <h2 className="font-heading text-2xl font-bold mb-2">
                  {status === "expired" ? "Session Expired" : "Payment Issue"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {status === "expired"
                    ? "Your payment session has expired. Please try again."
                    : status === "timeout"
                    ? "We couldn't confirm your payment. Please check your email or contact support."
                    : "There was an issue with your payment. Please try again."}
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/courses")}>
                    Browse Courses
                  </Button>
                  <Button className="flex-1" onClick={() => navigate("/dashboard")}>
                    Dashboard
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;
