import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Check, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import { api } from "@/lib/api";

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Centralized state for the entire flow
  const [formData, setFormData] = useState({
    firstName: "",
    email: "user@example.com", // This would come from your AuthContext
    avatar: "😀",
    course: "",
    year: "",
    goals: [],
    study_time: "", 
    study_hours: 1, 
    study_days: 3,
    challenges: [],
    habits: [],
    motivation: "",
  });

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    setFormData((prev) => {
      const current = prev[field];
      if (current.includes(item)) {
        return { ...prev, [field]: current.filter((i) => i !== item) };
      } else {
        return { ...prev, [field]: [...current, item] };
      }
    });
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 6));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // We use PATCH to update the existing empty profile created during signup
      await api.patch("/user/profile/me", formData);
      console.log(formData);
      navigate("/dashboard");
    } catch (error) {
      console.error("Profile update failed:", error);
      // Future use toast here to notify the user
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- Reusable UI Components for Cards ---
  const SelectableCard = ({ label, icon, selected, onClick }) => (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${
        selected
          ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
          : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-0.5">
          <Check size={14} />
        </div>
      )}
      <div className="text-3xl mb-2">{icon}</div>
      <span className="text-sm font-medium text-center">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-10 pb-20 px-4">
      {/* Progress Bar */}
      <div className="w-full max-w-2xl mb-8">
        <p className="text-sm font-medium text-gray-500 mb-2">
          Step {step} of 6
        </p>
        <div className="flex gap-2 w-full">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${
                i <= step ? "bg-indigo-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 w-full max-w-2xl">
        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold mb-2">Hey there! 👋</h1>
            <p className="text-gray-500 mb-8">
              Let's get to know you better. This will take less than 2 minutes.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  What should we call you?
                </label>
                <Input
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChange={(e) => updateForm("firstName", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Your Email
                </label>
                <Input
                  disabled
                  value={formData.email}
                  className="bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Choose your avatar
                </label>
                <div className="flex gap-4 text-3xl">
                  {["😀", "😎", "👨‍🎓", "👩‍🎓", "📚", "🚀"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => updateForm("avatar", emoji)}
                      className={`p-3 rounded-full transition-transform hover:scale-110 ${
                        formData.avatar === emoji
                          ? "bg-indigo-100 ring-2 ring-indigo-500"
                          : "bg-gray-50"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Academic Profile */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-2">🎓 Academic Profile</h2>
            <p className="text-gray-500 mb-6">
              Tell us about your academic journey.
            </p>

            <div className="mb-8">
              <label className="block text-sm font-medium mb-3">
                Current Course
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["BCA", "B.Tech", "B.Sc", "B.Com", "BA", "Other"].map(
                  (course) => (
                    <SelectableCard
                      key={course}
                      label={course}
                      icon="📚" // You can map specific icons to courses if desired
                      selected={formData.course === course}
                      onClick={() => updateForm("course", course)}
                    />
                  ),
                )}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium mb-3">
                Current Year
              </label>
              <div className="grid grid-cols-4 gap-3">
                {["1", "2", "3", "4"].map((year) => (
                  <button
                    key={year}
                    onClick={() => updateForm("year", year)}
                    className={`py-3 rounded-xl border font-medium transition-all ${
                      formData.year === year
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600"
                        : "border-gray-200 hover:border-indigo-300"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Study Routine */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-2">⏰ Study Routine</h2>
            <p className="text-gray-500 mb-6">
              Help us understand your study pattern.
            </p>

            <div className="mb-8">
              <label className="block text-sm font-medium mb-3">
                Preferred Study Time
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SelectableCard
                  label="Morning"
                  icon="🌅"
                  selected={formData.study_time === "Morning"}
                  onClick={() => updateForm("study_time", "Morning")}
                />
                <SelectableCard
                  label="Afternoon"
                  icon="☀️"
                  selected={formData.study_time === "Afternoon"}
                  onClick={() => updateForm("study_time", "Afternoon")}
                />
                <SelectableCard
                  label="Evening"
                  icon="🌆"
                  selected={formData.study_time === "Evening"}
                  onClick={() => updateForm("study_time", "Evening")}
                />
                <SelectableCard
                  label="Night"
                  icon="🌙"
                  selected={formData.study_time === "Night"}
                  onClick={() => updateForm("study_time", "Night")}
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium mb-2 flex justify-between">
                <span>Average Study Hours Per Day</span>
                <span className="text-indigo-600 font-bold">
                  {formData.study_hours} Hours
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="8"
                value={formData.study_hours}
                onChange={(e) => updateForm("study_hours", parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span>
                <span>8+</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 flex justify-between">
                <span>Study Days Per Week</span>
                <span className="text-indigo-600 font-bold">
                  {formData.study_days} Days
                </span>
              </label>
              <input
                type="range"
                min="1"
                max="7"
                value={formData.study_days}
                onChange={(e) => updateForm("study_days", parseInt(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>7</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Challenges */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-2">⚠️ Biggest Challenges</h2>
            <p className="text-gray-500 mb-6">
              Select the challenges you face regularly. (Select multiple)
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Phone Distraction", icon: "📱" },
                { label: "Social Media", icon: "📲" },
                { label: "Procrastination", icon: "⏳" },
                { label: "Lack of Motivation", icon: "🎯" },
                { label: "Poor Focus", icon: "🤯" },
                { label: "Stress", icon: "😓" },
                { label: "Sleep Issues", icon: "😴" },
                { label: "Poor Planning", icon: "📅" },
              ].map((item) => (
                <SelectableCard
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  selected={formData.challenges.includes(item.label)}
                  onClick={() => toggleArrayItem("challenges", item.label)}
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Habits to Build */}
        {step === 5 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold mb-2">
              🌱 Habits You Want to Build
            </h2>
            <p className="text-gray-500 mb-6">
              Choose the habits you want to improve.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Daily Study", icon: "📖" },
                { label: "Exercise", icon: "🏃" },
                { label: "Drink Water", icon: "💧" },
                { label: "Better Sleep", icon: "🛌" },
                { label: "Less Screen Time", icon: "📵" },
                { label: "Meditation", icon: "🧘" },
                { label: "Coding Practice", icon: "💻" },
                { label: "Reading", icon: "📚" },
              ].map((item) => (
                <SelectableCard
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  selected={formData.habits.includes(item.label)}
                  onClick={() => toggleArrayItem("habits", item.label)}
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP 6: Motivation & Finish */}
        {step === 6 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-4">
                <Check size={40} />
              </div>
              <h2 className="text-3xl font-bold mb-2">You're almost set!</h2>
              <p className="text-gray-500">Just one last thing.</p>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium mb-2 text-center">
                What motivates you to improve?
              </label>
              <textarea
                className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-indigo-600 outline-none"
                rows="4"
                maxLength="100"
                placeholder="E.g., I want to stay consistent and get good placements..."
                value={formData.motivation}
                onChange={(e) => updateForm("motivation", e.target.value)}
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {formData.motivation.length} / 100
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-10 flex items-center justify-between border-t pt-6">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 1 || isSubmitting}
            className={step === 1 ? "invisible" : ""}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          {step < 6 ? (
            <Button
              onClick={nextStep}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
            >
              Continue <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
            >
              {isSubmitting ? "Saving Profile..." : "Start My Journey 🚀"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
