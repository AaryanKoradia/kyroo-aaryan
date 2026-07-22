"use client";
import { useState } from "react";
import {
  Dumbbell, Flag, BedDouble, Brain, Wallet, Salad, Target, MessageCircle,
  Sofa, Footprints, PersonStanding, Trophy, Flame, StretchHorizontal, Timer, HeartPulse, Star,
  Home, Bike, Waves,
  Briefcase, HeartCrack, CircleDollarSign, BatteryLow, CircleHelp, BarChart3, Landmark,
  Leaf, Drumstick, Egg, Sprout,
  UtensilsCrossed, ChefHat, Candy, Coffee, Moon, Droplet,
  Sunrise, Sun,
  Laptop, Rocket, GraduationCap, Palette,
  Meh, Smartphone, Clock, Smile, Zap,
  type LucideIcon,
} from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://kyroo-backend.onrender.com";

const steps: { id: number; icon: LucideIcon | null; domain: string; title: string; sub: string }[] = [
  { id: 1, icon: null, domain: "Getting Started", title: "Hey! I'm Kiro\nLet's get to know each other", sub: "I'll ask you 10 quick questions. The more you share, the smarter I get. Takes about 3 minutes." },
  { id: 2, icon: Dumbbell, domain: "Fitness", title: "What's your current fitness situation?", sub: "Be honest — Kiro won't judge. This helps build your perfect plan." },
  { id: 3, icon: Flag, domain: "Fitness Goal", title: "What do you want your body to do?", sub: "Pick your primary fitness goal." },
  { id: 4, icon: BedDouble, domain: "Sleep", title: "How's your sleep honestly?", sub: "Sleep affects everything — fitness, money decisions, mood." },
  { id: 5, icon: Brain, domain: "Mind", title: "How's your mental state these days?", sub: "No judgment. This stays completely private." },
  { id: 6, icon: Wallet, domain: "Money", title: "Let's talk about your money habits", sub: "Kiro reads your spending SMS automatically. No bank login ever." },
  { id: 7, icon: Salad, domain: "Nutrition", title: "What does your eating look like?", sub: "Kiro plans meals around Indian food — dal, roti, sabzi." },
  { id: 8, icon: Target, domain: "Productivity", title: "How productive are you really?", sub: "Kiro optimises your day around your actual energy levels." },
  { id: 9, icon: MessageCircle, domain: "Communication", title: "How should Kiro talk to you?", sub: "Pick language. Kiro handles Hinglish too." },
  { id: 10, icon: null, domain: "Your KIRO Profile", title: "Kiro knows you now", sub: "Here's your personalised starting profile." },
];

type Opt = { icon: LucideIcon; label: string };

const fitnessLevels: Opt[] = [
  { icon: Sofa, label: "Couch potato" },
  { icon: Footprints, label: "Light mover" },
  { icon: PersonStanding, label: "Moderate" },
  { icon: Dumbbell, label: "Active" },
  { icon: Trophy, label: "Athlete mode" },
];
const fitnessGoals: Opt[] = [
  { icon: Flame, label: "Lose weight" },
  { icon: Dumbbell, label: "Build muscle" },
  { icon: StretchHorizontal, label: "Flexibility" },
  { icon: Timer, label: "Endurance" },
  { icon: HeartPulse, label: "Stay healthy" },
  { icon: Star, label: "Overall fitness" },
];
const workoutTypes: Opt[] = [
  { icon: Home, label: "Home workouts" },
  { icon: Dumbbell, label: "Gym" },
  { icon: StretchHorizontal, label: "Yoga" },
  { icon: Footprints, label: "Running" },
  { icon: Bike, label: "Cycling" },
  { icon: Waves, label: "Swimming" },
];
const sleepHours = ["4h", "5h", "6h", "7h", "8h", "9h+"];
const sleepQualities: Opt[] = [
  { icon: BatteryLow, label: "Poor sleep quality" },
  { icon: Meh, label: "Okay but not great" },
  { icon: BedDouble, label: "Sleep pretty well" },
];
const sleepIssues: Opt[] = [
  { icon: Smartphone, label: "Phone in bed" },
  { icon: Coffee, label: "Late caffeine" },
  { icon: BatteryLow, label: "Anxiety at night" },
  { icon: Moon, label: "Sleep late" },
  { icon: Clock, label: "Irregular schedule" },
];
const stressTriggers: Opt[] = [
  { icon: Briefcase, label: "Work stress" },
  { icon: HeartCrack, label: "Relationship stress" },
  { icon: CircleDollarSign, label: "Money anxiety" },
  { icon: BatteryLow, label: "Low motivation" },
  { icon: Brain, label: "Overthinking" },
  { icon: Flame, label: "Burnout" },
  { icon: Smile, label: "Actually fine" },
];
const moneyHabits: Opt[] = [
  { icon: Waves, label: "Money disappears every month" },
  { icon: CircleHelp, label: "Manage okay but no real plan" },
  { icon: BarChart3, label: "Track expenses regularly" },
  { icon: Landmark, label: "Financially disciplined" },
];
const incomeRanges = ["Under ₹25K", "₹25K–₹50K", "₹50K–₹1L", "₹1L–₹2L", "₹2L+", "Prefer not to say"];
const dietTypes: Opt[] = [
  { icon: Leaf, label: "Vegetarian" },
  { icon: Drumstick, label: "Non-veg" },
  { icon: Egg, label: "Eggetarian" },
  { icon: Sprout, label: "Vegan" },
];
const eatHabits: Opt[] = [
  { icon: UtensilsCrossed, label: "Order food 4x+ week" },
  { icon: ChefHat, label: "Cook at home" },
  { icon: Candy, label: "Sugar cravings" },
  { icon: Coffee, label: "Skip breakfast" },
  { icon: Moon, label: "Late night eating" },
  { icon: Droplet, label: "Forget water" },
];
const energyPeaks: Opt[] = [
  { icon: Sunrise, label: "Morning person" },
  { icon: Sun, label: "Afternoon peak" },
  { icon: Moon, label: "Night owl" },
];
const jobTypes: Opt[] = [
  { icon: Briefcase, label: "9-to-5 job" },
  { icon: Laptop, label: "WFH" },
  { icon: Rocket, label: "Founder" },
  { icon: GraduationCap, label: "Student" },
  { icon: Palette, label: "Freelancer" },
  { icon: Home, label: "Homemaker" },
];
const languages = ["Hinglish", "English", "Hindi", "Tamil", "Telugu", "Marathi", "Bengali", "Gujarati"];
const nudgeTimes = ["6 AM", "7 AM", "8 AM", "9 AM"];

const SUMMARY_ICONS: Record<string, LucideIcon> = {
  Fitness: Dumbbell, Sleep: BedDouble, Mind: Brain, Money: Wallet, Nutrition: Salad, Energy: Zap,
};

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [fitnessWorkouts, setFitnessWorkouts] = useState<string[]>([]);
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [injuries, setInjuries] = useState("");
  const [sleepHour, setSleepHour] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [selectedSleepIssues, setSelectedSleepIssues] = useState<string[]>([]);
  const [stressLevel, setStressLevel] = useState(0);
  const [selectedStressTriggers, setSelectedStressTriggers] = useState<string[]>([]);
  const [moneyHabit, setMoneyHabit] = useState("");
  const [incomeRange, setIncomeRange] = useState("");
  const [dietType, setDietType] = useState("");
  const [selectedEatHabits, setSelectedEatHabits] = useState<string[]>([]);
  const [dietRestrictions, setDietRestrictions] = useState("");
  const [energyPeak, setEnergyPeak] = useState("");
  const [selectedJobType, setSelectedJobType] = useState("");
  const [language, setLanguage] = useState("Hinglish");
  const [phone, setPhone] = useState("");
  const [nudgeTime, setNudgeTime] = useState("7 AM");

  const progress = (step / 10) * 100;

  const toggleArr = (arr: string[], setArr: (a: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, phone, city,
          age: parseInt(age) || 0,
          language, nudge_time: nudgeTime,
          fitness_level: fitnessLevel,
          fitness_goal: fitnessGoal,
          sleep_hours: sleepHour,
          stress_level: stressLevel,
          money_habit: moneyHabit,
          diet_type: dietType,
          energy_peak: energyPeak,
          plan: "free",
          injuries,
          fitness_workouts: fitnessWorkouts,
          sleep_quality: sleepQuality,
          sleep_issues: selectedSleepIssues,
          stress_triggers: selectedStressTriggers,
          income_range: incomeRange,
          eat_habits: selectedEatHabits,
          diet_restrictions: dietRestrictions,
          job_type: selectedJobType
        })
      });
      const data = await res.json();
      if (data.user_id) {
        localStorage.setItem("kiro_user_id", data.user_id);
        localStorage.setItem("kiro_user_name", name);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
    window.location.href = "/pricing";
  };

  const s: React.CSSProperties = {
    background: "var(--k-paper)", minHeight: "100vh",
    color: "var(--k-ink)", fontFamily: "var(--font-body)",
    display: "flex", flexDirection: "column"
  };

  const btn = (active: boolean, onClick: () => void, label: string, Icon?: LucideIcon) => (
    <button key={label} onClick={onClick} style={{
      padding: "9px 15px", border: active ? "2.5px solid var(--k-ink)" : "2.5px solid rgba(20,18,15,0.14)",
      background: active ? "var(--k-lime)" : "var(--k-paper)",
      color: "var(--k-ink)",
      fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
      fontWeight: active ? 700 : 400,
      boxShadow: active ? "3px 3px 0 var(--k-ink)" : "none",
      transition: "all .12s ease",
      display: "inline-flex", alignItems: "center", gap: 7,
    }}>{Icon && <Icon size={14} strokeWidth={2.3} />}{label}</button>
  );

  const optBtn = (active: boolean, onClick: () => void, label: string, Icon?: LucideIcon) => (
    <button key={label} onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12,
      padding: "14px 16px",
      border: active ? "3px solid var(--k-ink)" : "2.5px solid rgba(20,18,15,0.12)",
      background: active ? "var(--k-lime)" : "var(--k-paper)",
      color: "var(--k-ink)", fontSize: 14, cursor: "pointer",
      fontFamily: "var(--font-body)", fontWeight: active ? 700 : 400,
      marginBottom: 10, textAlign: "left",
      boxShadow: active ? "4px 4px 0 var(--k-ink)" : "none",
      transition: "all .12s ease",
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%",
        border: active ? "2px solid var(--k-ink)" : "2px solid rgba(20,18,15,0.25)",
        background: active ? "var(--k-ink)" : "transparent",
        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {active && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--k-lime)" }}></div>}
      </div>
      {Icon && <Icon size={16} strokeWidth={2.2} style={{ flexShrink: 0 }} />}
      {label}
    </button>
  );

  const optCard = (active: boolean, onClick: () => void, Icon: LucideIcon, label: string) => (
    <button key={label} onClick={onClick} style={{
      padding: "16px 14px", borderRadius: 16, textAlign: "center",
      border: active ? "3px solid var(--k-ink)" : "2.5px solid rgba(20,18,15,0.14)",
      background: active ? "var(--k-lime)" : "var(--k-paper)",
      color: "var(--k-ink)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)",
      fontWeight: active ? 700 : 400, boxShadow: active ? "3px 3px 0 var(--k-ink)" : "none",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    }}>
      <Icon size={20} strokeWidth={2.2} />
      {label}
    </button>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--k-paper)",
    border: "2.5px solid rgba(20,18,15,0.14)",
    padding: "13px 16px",
    fontSize: 15, color: "var(--k-ink)",
    fontFamily: "var(--font-body)", outline: "none", marginBottom: 12
  };

  const CurrentDomainIcon = steps[step - 1].icon;

  return (
    <div className="k-grain" style={s}>
      <style>{`.k-onb-btn { font-family: var(--font-body); font-weight: 700; cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-ink); color: var(--k-paper); box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
      .k-onb-btn:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
      .k-onb-btn:active { transform: translate(2px,2px); box-shadow: 0 0 0 var(--k-ink); }
      .k-onb-btn:disabled { opacity: .6; cursor: default; }
      .k-onb-back { font-family: var(--font-body); cursor: pointer; border: 3px solid var(--k-ink); background: var(--k-paper); color: var(--k-ink); box-shadow: 4px 4px 0 var(--k-ink); transition: transform .12s ease, box-shadow .12s ease; }
      .k-onb-back:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--k-ink); }
      input::placeholder { color: rgba(20,18,15,0.35); }`}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: "3px solid var(--k-ink)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <img src="/kyroo-logo.png" alt="KYROO" style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
          <div style={{ fontFamily: "var(--font-display)", fontSize: 17 }}>KYROO<span style={{ color: "var(--k-coral)" }}>.</span></div>
        </div>
        <div style={{ flex: 1, margin: "0 24px", height: 12, background: "var(--k-paper)", border: "2px solid var(--k-ink)" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "var(--k-lime)", transition: "width 0.4s ease" }}></div>
        </div>
        <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700 }}>{step} / 10</div>
      </div>

      <div style={{ flex: 1, padding: "36px 28px 20px", maxWidth: 540, margin: "0 auto", width: "100%" }}>
        <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, padding: "3px 9px", background: "var(--k-lime)", border: "2px solid var(--k-ink)", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
          {CurrentDomainIcon && <CurrentDomainIcon size={12} strokeWidth={2.5} />}
          {steps[step - 1].domain}
        </span>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, letterSpacing: -0.5, lineHeight: 1.15, marginBottom: 10, whiteSpace: "pre-line", textTransform: "uppercase" }}>
          {steps[step - 1].title}
        </h2>
        <p style={{ fontSize: 13.5, opacity: 0.6, lineHeight: 1.65, marginBottom: 32 }}>
          {steps[step - 1].sub}
        </p>

        {step === 1 && (
          <div>
            <div style={{ background: "var(--k-paper)", border: "3px solid var(--k-ink)", boxShadow: "4px 4px 0 var(--k-ink)", padding: "14px 16px", marginBottom: 24, fontSize: 13, lineHeight: 1.65, transform: "rotate(-0.6deg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <img src="/kyroo-logo.png" alt="KYROO" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 12 }}>KYROO</span>
              </div>
              Main hoon tera AI best friend 😊 Fitness, money, mind, sleep — sab kuch handle karunga. Pehle tujhe thoda jaanna chahta hoon. Ready?
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 7 }}>Your name</label>
                <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="Raj" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 7 }}>Age</label>
                <input style={{ ...inputStyle, marginBottom: 0 }} placeholder="24" type="number" value={age} onChange={e => setAge(e.target.value)} />
              </div>
            </div>
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 7 }}>City</label>
            <input style={inputStyle} placeholder="Mumbai, Delhi..." value={city} onChange={e => setCity(e.target.value)} />
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 7 }}>Email</label>
            <input style={inputStyle} placeholder="you@email.com" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        )}

        {step === 2 && (
          <div>
            {fitnessLevels.map(f => optBtn(fitnessLevel === f.label, () => setFitnessLevel(f.label), f.label, f.icon))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 8 }}>
              {workoutTypes.map(w =>
                btn(fitnessWorkouts.includes(w.label), () => toggleArr(fitnessWorkouts, setFitnessWorkouts, w.label), w.label, w.icon)
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 24 }}>
              {fitnessGoals.map(g => optCard(fitnessGoal === g.label, () => setFitnessGoal(g.label), g.icon, g.label))}
            </div>
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 7 }}>Any injuries?</label>
            <input style={inputStyle} placeholder="Bad knees, back pain... (optional)" value={injuries} onChange={e => setInjuries(e.target.value)} />
          </div>
        )}

        {step === 4 && (
          <div>
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 10 }}>Hours of sleep per night</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {sleepHours.map(h => (
                <button key={h} onClick={() => setSleepHour(h)} style={{
                  flex: 1, height: 44, borderRadius: 12,
                  border: sleepHour === h ? "3px solid var(--k-ink)" : "2.5px solid rgba(20,18,15,0.14)",
                  background: sleepHour === h ? "var(--k-lime)" : "var(--k-paper)",
                  color: "var(--k-ink)",
                  fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: sleepHour === h ? 700 : 400
                }}>{h}</button>
              ))}
            </div>
            {sleepQualities.map(q =>
              optBtn(sleepQuality === q.label, () => setSleepQuality(q.label), q.label, q.icon)
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 8 }}>
              {sleepIssues.map(i =>
                btn(selectedSleepIssues.includes(i.label), () => toggleArr(selectedSleepIssues, setSelectedSleepIssues, i.label), i.label, i.icon)
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 10 }}>Stress level (1-10)</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setStressLevel(n)} style={{
                  flex: 1, height: 44, borderRadius: 10,
                  border: stressLevel === n ? "3px solid var(--k-ink)" : "2.5px solid rgba(20,18,15,0.14)",
                  background: stressLevel === n ? "var(--k-lime)" : "var(--k-paper)",
                  color: "var(--k-ink)",
                  fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: stressLevel === n ? 700 : 400
                }}>{n}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              {stressTriggers.map(t => btn(selectedStressTriggers.includes(t.label), () => toggleArr(selectedStressTriggers, setSelectedStressTriggers, t.label), t.label, t.icon))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            {moneyHabits.map(m => optBtn(moneyHabit === m.label, () => setMoneyHabit(m.label), m.label, m.icon))}
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", margin: "16px 0 10px" }}>Monthly income (optional)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              {incomeRanges.map(i => btn(incomeRange === i, () => setIncomeRange(i), i))}
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 16 }}>
              {dietTypes.map(d => optCard(dietType === d.label, () => setDietType(d.label), d.icon, d.label))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 16 }}>
              {eatHabits.map(e => btn(selectedEatHabits.includes(e.label), () => toggleArr(selectedEatHabits, setSelectedEatHabits, e.label), e.label, e.icon))}
            </div>
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 7 }}>Dietary restrictions?</label>
            <input style={inputStyle} placeholder="Diabetes, lactose intolerant... (optional)" value={dietRestrictions} onChange={e => setDietRestrictions(e.target.value)} />
          </div>
        )}

        {step === 8 && (
          <div>
            {energyPeaks.map(e => optBtn(energyPeak === e.label, () => setEnergyPeak(e.label), e.label, e.icon))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 8 }}>
              {jobTypes.map(j => btn(selectedJobType === j.label, () => setSelectedJobType(j.label), j.label, j.icon))}
            </div>
          </div>
        )}

        {step === 9 && (
          <div>
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 10 }}>Preferred language</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
              {languages.map(l => (
                <button key={l} onClick={() => setLanguage(l)} style={{
                  padding: "12px 8px", borderRadius: 14, textAlign: "center",
                  border: language === l ? "3px solid var(--k-ink)" : "2.5px solid rgba(20,18,15,0.14)",
                  background: language === l ? "var(--k-lime)" : "var(--k-paper)",
                  color: "var(--k-ink)",
                  fontSize: 13, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: language === l ? 700 : 400
                }}>{l}</button>
              ))}
            </div>
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 7 }}>WhatsApp number</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--k-paper)", border: "2.5px solid rgba(20,18,15,0.14)", borderRadius: 4, padding: "12px 16px", marginBottom: 16 }}>
              <span style={{ fontFamily: "var(--font-mono-tag)", fontSize: 11, fontWeight: 700, border: "1.5px solid rgba(20,18,15,0.3)", borderRadius: 3, padding: "2px 5px" }}>IN</span>
              <span style={{ color: "rgba(20,18,15,0.5)", fontSize: 14 }}>+91</span>
              <input style={{ flex: 1, background: "none", border: "none", fontSize: 15, color: "var(--k-ink)", outline: "none", fontFamily: "var(--font-body)" }} placeholder="98765 43210" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <label style={{ fontSize: 11, color: "rgba(20,18,15,0.5)", display: "block", marginBottom: 10 }}>Best time for morning nudge</label>
            <div style={{ display: "flex", gap: 10 }}>
              {nudgeTimes.map(t => (
                <button key={t} onClick={() => setNudgeTime(t)} style={{
                  flex: 1, padding: "11px 8px", borderRadius: 12,
                  border: nudgeTime === t ? "3px solid var(--k-ink)" : "2.5px solid rgba(20,18,15,0.14)",
                  background: nudgeTime === t ? "var(--k-lime)" : "var(--k-paper)",
                  color: "var(--k-ink)",
                  fontSize: 12, cursor: "pointer", fontFamily: "var(--font-body)", fontWeight: nudgeTime === t ? 700 : 400
                }}>{t}</button>
              ))}
            </div>
          </div>
        )}

        {step === 10 && (
          <div>
            <div style={{ background: "var(--k-paper)", border: "3px solid var(--k-ink)", boxShadow: "4px 4px 0 var(--k-ink)", padding: "14px 16px", marginBottom: 24, fontSize: 13, lineHeight: 1.65, transform: "rotate(-0.6deg)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <img src="/kyroo-logo.png" alt="KYROO" style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid var(--k-ink)", objectFit: "cover" }} />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 12 }}>KYROO</span>
              </div>
              Yaar sab samajh gaya main 😊 Tera profile ready hai. Kal se sab handle karta hoon.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Fitness", val: fitnessLevel || "Not set" },
                { label: "Sleep", val: sleepHour ? `${sleepHour} avg` : "Not set" },
                { label: "Mind", val: stressLevel ? `Stress: ${stressLevel}/10` : "Not set" },
                { label: "Money", val: incomeRange || "Not set" },
                { label: "Nutrition", val: dietType || "Not set" },
                { label: "Energy", val: energyPeak || "Not set" },
              ].map(item => {
                const Icon = SUMMARY_ICONS[item.label];
                return (
                  <div key={item.label} style={{ background: "var(--k-paper)", border: "2.5px solid var(--k-ink)", padding: 14 }}>
                    <div style={{ marginBottom: 8 }}><Icon size={18} strokeWidth={2.2} /></div>
                    <div style={{ fontFamily: "var(--font-mono-tag)", fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", opacity: 0.5, marginBottom: 4, fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{item.val}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "16px 28px", borderTop: "3px solid var(--k-ink)", display: "flex", gap: 10, maxWidth: 540, margin: "0 auto", width: "100%" }}>
        {step > 1 && (
          <button className="k-onb-back" onClick={() => setStep(step - 1)} style={{ width: 50, height: 52, fontSize: 18, flexShrink: 0 }}>←</button>
        )}
        <button
          className="k-onb-btn"
          onClick={step < 10 ? () => setStep(step + 1) : handleFinish}
          disabled={loading}
          style={{ flex: 1, height: 52, fontSize: 15, background: "var(--k-lime)", color: "var(--k-ink)" }}>
          {loading ? "Setting up KYROO..." : step === 10 ? "Choose your plan →" : step === 1 ? "Let's go! →" : "Next →"}
        </button>
      </div>
    </div>
  );
}
