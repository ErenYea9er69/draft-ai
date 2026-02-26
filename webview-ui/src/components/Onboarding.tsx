import { useState } from "react";
import { useVSCode } from "../hooks/useVSCode";

interface OnboardingProps {
    onComplete: () => void;
}

const STEPS = [
    { key: "appDescription", label: "What does your app do?", placeholder: "A SaaS platform that helps freelancers manage invoices and track payments.", type: "textarea" as const },
    { key: "targetUsers", label: "Who are your target users?", placeholder: "Freelance developers, designers, and consultants who need simple invoicing.", type: "textarea" as const },
    { key: "currentFeatures", label: "What features exist today?", placeholder: "User auth, invoice creation, PDF export, payment tracking, client management.", type: "textarea" as const },
    { key: "plannedFeatures", label: "What features are coming?", placeholder: "Recurring invoices, payment gateway integration, expense tracking, reports.", type: "textarea" as const },
    { key: "competitors", label: "Who are your competitors?", placeholder: "FreshBooks, Wave, Invoice Ninja, Hiveage", hint: "Comma-separated names", type: "input" as const },
    { key: "designIntent", label: "What's your design vision?", placeholder: "Dark minimal SaaS, clean typography, professional but approachable.", type: "textarea" as const },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
    const { postMessage } = useVSCode();
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<Record<string, string>>({
        appDescription: "",
        targetUsers: "",
        currentFeatures: "",
        plannedFeatures: "",
        competitors: "",
        designIntent: "",
    });

    const currentStep = STEPS[step];
    const isLastStep = step === STEPS.length - 1;
    const canProceed = formData[currentStep.key]?.trim().length > 0;

    const handleNext = () => {
        if (isLastStep) {
            // Save profile
            const profile = {
                ...formData,
                competitors: formData.competitors
                    .split(",")
                    .map((c) => c.trim())
                    .filter((c) => c.length > 0),
                updatedAt: new Date().toISOString(),
            };
            postMessage("saveProfile", profile);
            onComplete();
        } else {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && canProceed) {
            e.preventDefault();
            handleNext();
        }
    };

    return (
        <div className="onboarding fade-in">
            <div className="onboarding-header">
                <div className="onboarding-icon">🐱</div>
                <h1 className="onboarding-title">Welcome to Draft AI</h1>
                <p className="onboarding-subtitle">
                    Tell me about your project so I can provide tailored analysis across code health, competitor insights, and UI/UX.
                </p>
            </div>

            <div className="onboarding-step">
                Step {step + 1} of {STEPS.length}
            </div>

            <div className="form-group" key={step}>
                <label className="form-label">{currentStep.label}</label>
                {currentStep.type === "textarea" ? (
                    <textarea
                        className="input textarea"
                        placeholder={currentStep.placeholder}
                        value={formData[currentStep.key]}
                        onChange={(e) =>
                            setFormData({ ...formData, [currentStep.key]: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        rows={3}
                        autoFocus
                    />
                ) : (
                    <input
                        className="input"
                        type="text"
                        placeholder={currentStep.placeholder}
                        value={formData[currentStep.key]}
                        onChange={(e) =>
                            setFormData({ ...formData, [currentStep.key]: e.target.value })
                        }
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                )}
                {currentStep.hint && (
                    <p className="form-hint">{currentStep.hint}</p>
                )}
            </div>

            <div className="flex gap-sm">
                {step > 0 && (
                    <button className="btn btn-secondary" onClick={handleBack}>
                        ← Back
                    </button>
                )}
                <button
                    className="btn btn-primary w-full"
                    onClick={handleNext}
                    disabled={!canProceed}
                >
                    {isLastStep ? "🚀 Launch Draft AI" : "Next →"}
                </button>
            </div>

            {/* Progress dots */}
            <div className="flex gap-sm mt-md" style={{ justifyContent: "center" }}>
                {STEPS.map((_, i) => (
                    <div
                        key={i}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background:
                                i === step
                                    ? "var(--draftai-accent)"
                                    : i < step
                                        ? "var(--draftai-success)"
                                        : "var(--draftai-border)",
                            transition: "background 0.2s",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
