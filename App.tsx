import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, DayState, WeekHistory } from './types';
import { DAY_DESCRIPTIONS, ACTIVITIES, MOODS } from './constants';
import { CheckIcon, SunIcon, MoonIcon, CloseIcon, GitHubIcon, SupabaseIcon, RobotIcon } from './components/Icons';
import type confetti from 'canvas-confetti';
import { GoogleGenAI } from '@google/genai';

declare global {
    interface Window {
        confetti: typeof confetti;
        supabase: any;
    }
}

// --- Supabase Constants ---
const USER_ID = '00000000-0000-0000-0000-000000000001'; // Hardcoded user ID for this single-user version
const SUPABASE_PROJECT_ID = 'gjfkuflstdvvwmmxctpp';

// --- Script de configuration Supabase ---
const SUPABASE_SETUP_SQL = `-- 1. Crée la table pour stocker les données
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  updated_at timestamptz,
  app_state jsonb
);

-- 2. Active la sécurité au niveau des lignes (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Crée les politiques d'accès pour autoriser la lecture et l'écriture
-- Cette politique autorise tout le monde (rôle "anon") à lire et écrire,
-- ce qui est adapté pour cette application publique mono-utilisateur.
CREATE POLICY "Allow public read and write access"
ON public.profiles
FOR ALL -- Autorise SELECT, INSERT, UPDATE, DELETE
USING (true)
WITH CHECK (true);`;


// Helper Functions
const playSound = (soundRef: React.RefObject<HTMLAudioElement>) => {
    if (soundRef.current) {
        soundRef.current.currentTime = 0;
        soundRef.current.volume = 0.3;
        soundRef.current.play().catch(() => {});
    }
};

const popConfetti = (element: HTMLElement, color: string) => {
    const rect = element.getBoundingClientRect();
    window.confetti({
        particleCount: 25, spread: 50,
        origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight },
        colors: [color], ticks: 100, gravity: 2, scalar: 0.8, shapes: ['circle']
    });
};

// --- Sub-Components defined in the same file for conciseness ---

const SupabaseSetupModal: React.FC<{ error: { message: string } }> = ({ error }) => {
    const [copied, setCopied] = React.useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };
    const projectUrl = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new`;

    return (
        <div className="fixed inset-0 bg-slate-100 dark:bg-gray-900 z-50 grid place-items-center p-4 animate-in fade-in-0">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full text-slate-800 dark:text-gray-200">
                <h2 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500">🚀 Configuration Initiale Requise</h2>
                <p className="text-slate-600 dark:text-gray-300 mb-8">
                    Bienvenue ! Pour que l'application puisse sauvegarder votre progression, une petite configuration de la base de données est nécessaire. C'est une étape unique et rapide.
                </p>

                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-lg mb-2 flex items-center"><span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-3 font-mono text-sm">1</span> Ouvrir l'Éditeur SQL</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400 ml-9 mb-3">Cliquez sur ce bouton pour ouvrir l'éditeur SQL de votre projet Supabase dans un nouvel onglet.</p>
                        <a href={projectUrl} target="_blank" rel="noopener noreferrer" className="ml-9 inline-block py-2 px-5 font-semibold text-white bg-emerald-600 rounded-full shadow-lg hover:bg-emerald-700 transition-all hover:scale-105">
                            Ouvrir Supabase
                        </a>
                    </div>

                    <div>
                        <h3 className="font-bold text-lg mb-2 flex items-center"><span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-3 font-mono text-sm">2</span> Copier & Coller le Script</h3>
                        <p className="text-sm text-slate-500 dark:text-gray-400 ml-9 mb-3">Copiez le script ci-dessous, collez-le dans l'éditeur Supabase, puis cliquez sur <strong>"RUN"</strong>.</p>
                        <div className="ml-9 relative bg-slate-100 dark:bg-gray-900 rounded-lg p-4 font-mono text-sm text-slate-700 dark:text-gray-200 max-h-40 overflow-y-auto border dark:border-gray-700">
                            <button onClick={handleCopy} className="absolute top-2 right-2 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 rounded-md px-3 py-1 text-xs font-semibold z-10 transition-colors">
                                {copied ? 'Copié ! ✓' : 'Copier'}
                            </button>
                            <pre><code className="whitespace-pre-wrap">{SUPABASE_SETUP_SQL}</code></pre>
                        </div>
                    </div>

                    <div>
                         <h3 className="font-bold text-lg mb-2 flex items-center"><span className="bg-blue-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center mr-3 font-mono text-sm">3</span> Recharger l'Application</h3>
                         <p className="text-sm text-slate-500 dark:text-gray-400 ml-9 mb-3">Une fois le script exécuté avec succès dans Supabase, revenez ici et rechargez la page.</p>
                         <button onClick={() => window.location.reload()} className="ml-9 py-3 px-6 font-bold text-white bg-blue-500 rounded-full shadow-lg hover:bg-blue-600 transition-all hover:scale-105">
                            Recharger la page
                        </button>
                    </div>
                </div>

                 <p className="text-xs text-center mt-8 text-slate-400 dark:text-gray-500">
                    Message technique : <code className="font-mono bg-slate-100 dark:bg-gray-700/50 p-1 rounded-md">{error.message}</code>
                 </p>
            </div>
        </div>
    );
};

const LoadingOverlay: React.FC = () => (
     <div className="fixed inset-0 bg-slate-100 dark:bg-gray-900 z-50 grid place-items-center p-8 text-center">
        <div className="flex flex-col items-center">
            <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-transparent bg-clip-text animate-pulse">Mon Coach Jeûne</h1>
            <p className="text-slate-500 dark:text-gray-400">Chargement des données...</p>
        </div>
    </div>
)

interface TopBarProps {
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
}
const TopBar: React.FC<TopBarProps> = ({ theme, onThemeToggle }) => {
    const [timer, setTimer] = useState({ statusText: "Chargement...", countdown: "--:--:--", color: "gray-400" });
    const [greeting, setGreeting] = useState("Bonjour");

    useEffect(() => {
        const intervalId = setInterval(() => {
            const now = new Date();
            const day = now.getDay(); // 0=Sunday, 6=Saturday
            const hrs = now.getHours();
            setGreeting(hrs >= 5 && hrs < 18 ? "Bonjour," : "Bonsoir,");

            if (day === 0 || day === 6) {
                setTimer({ statusText: "Mode Week-end", countdown: day === 6 ? "Recharge" : "Basket !", color: "pink-500" });
                return;
            }

            const isEating = hrs >= 12 && hrs < 21;
            let target = new Date(now);
            if (isEating) {
                target.setHours(21, 0, 0, 0);
                const diff = target.getTime() - now.getTime();
                setTimer({ statusText: "Fenêtre Alimentation", countdown: new Date(diff).toISOString().substr(11, 8), color: "amber-500" });
            } else {
                if (hrs >= 21) target.setDate(target.getDate() + 1);
                target.setHours(12, 0, 0, 0);
                const diff = target.getTime() - now.getTime();
                setTimer({ statusText: "En Jeûne (Brûle-graisse)", countdown: new Date(diff).toISOString().substr(11, 8), color: "purple-500" });
            }
        }, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const dotColor = `bg-${timer.color} shadow-[0_0_10px] shadow-${timer.color}`;

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <div className={`flex items-center gap-4 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 shadow-md rounded-full py-2 px-5 transition-colors`}>
                    <div className={`w-3 h-3 rounded-full animate-pulse ${dotColor}`}></div>
                    <div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-gray-400">{timer.statusText}</div>
                        <div className="text-lg font-extrabold text-slate-800 dark:text-gray-100 tracking-wider">{timer.countdown}</div>
                    </div>
                </div>
                <button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors">
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
            </div>
            <header className="text-center my-8 md:my-12">
                <span className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest">{greeting}</span>
                <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-500 to-emerald-500 text-transparent bg-clip-text tracking-tighter">Mon Coach Jeûne</h1>
            </header>
        </>
    );
};

interface DashboardProps {
    week: number;
    days: DayState[];
    historyLength: number;
    onShowHistory: () => void;
}
const Dashboard: React.FC<DashboardProps> = ({ week, days, historyLength, onShowHistory }) => {
    const doneCount = days.slice(0, 5).filter(d => d.done).length;
    const stats = [
        { label: 'Semaine Actuelle', value: week },
        { label: 'Objectif', value: `${doneCount}/5` },
        { label: 'Semaines Validées', value: historyLength },
        { label: "Voir l'historique", value: '📜', onClick: onShowHistory }
    ];
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map(stat => (
                <div key={stat.label} onClick={stat.onClick} className={`bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-slate-200 dark:border-gray-700 text-center transition-transform hover:-translate-y-1 ${stat.onClick ? 'cursor-pointer' : ''}`}>
                    <div className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">{stat.label}</div>
                    <div className="text-4xl font-extrabold text-slate-800 dark:text-gray-100">{stat.value}</div>
                </div>
            ))}
        </div>
    );
};

interface DayCardProps {
    dayIndex: number;
    dayState: DayState;
    onToggleDone: (index: number, el: HTMLElement) => void;
    onSetMood: (index: number, mood: number) => void;
    onActivityChange: (index: number, activity: string) => void;
    onToggleActivityDone: (index: number, el: HTMLElement) => void;
    onNoteChange: (index: number, note: string) => void;
}

const DayCard: React.FC<DayCardProps> = ({ dayIndex, dayState, onToggleDone, onSetMood, onActivityChange, onToggleActivityDone, onNoteChange }) => {
    const dayDesc = DAY_DESCRIPTIONS[dayIndex];
    let currentDayIndex = new Date().getDay() - 1;
    if (currentDayIndex === -1) currentDayIndex = 6;
    const isToday = dayIndex === currentDayIndex;

    const checkRef = useRef<HTMLDivElement>(null);
    const activityCheckRef = useRef<HTMLDivElement>(null);
    
    const baseCardClasses = "transition-all duration-300 rounded-xl p-5 border";
    const typeCardClasses = dayDesc.rest ? "bg-amber-50 border-amber-200 dark:bg-gray-800/50 dark:border-amber-900/50" : "bg-white border-slate-200 dark:bg-gray-800 dark:border-gray-700";
    const stateCardClasses = dayState.done ? "opacity-60" : "shadow-md";

    return (
        <div className={`day-card ${baseCardClasses} ${typeCardClasses} ${stateCardClasses} ${isToday ? 'is-today' : ''} ${dayState.done ? 'completed' : ''}`}>
            <div className="flex items-start gap-4">
                <div ref={checkRef} onClick={() => checkRef.current && onToggleDone(dayIndex, checkRef.current)} className="cursor-pointer pt-1">
                    <div className={`w-7 h-7 rounded-lg flex-shrink-0 grid place-items-center transition-all duration-300 transform active:scale-90 ${dayState.done ? (dayDesc.rest ? 'bg-pink-500' : 'bg-emerald-500') : 'bg-slate-200 dark:bg-gray-700'}`}>
                        {dayState.done && <CheckIcon className="text-white"/>}
                    </div>
                </div>

                <div className="flex-grow">
                    <h3 className={`font-bold text-lg text-slate-800 dark:text-gray-100 ${dayState.done ? 'line-through' : ''}`}>{dayDesc.t}</h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400">{dayDesc.d}</p>
                    
                    {!dayDesc.rest && (
                        <>
                            <div className={`mt-4 pt-3 border-t border-dashed border-slate-200 dark:border-gray-600 flex items-center gap-3 transition-opacity ${dayState.done ? 'opacity-50' : ''}`}>
                                <div ref={activityCheckRef} onClick={() => activityCheckRef.current && onToggleActivityDone(dayIndex, activityCheckRef.current)} className="cursor-pointer">
                                    <div className={`w-6 h-6 rounded-full flex-shrink-0 grid place-items-center transition-all duration-300 transform active:scale-90 ${dayState.activityDone ? 'bg-blue-500' : 'bg-slate-200 dark:bg-gray-700'}`}>
                                        {dayState.activityDone && <CheckIcon className="text-white w-4 h-4"/>}
                                    </div>
                                </div>
                                <select value={dayState.selectedActivity} onChange={(e) => onActivityChange(dayIndex, e.target.value)} className="w-full bg-slate-100 dark:bg-gray-900/50 border border-slate-200 dark:border-gray-600 rounded-md p-1 text-sm font-semibold text-slate-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500">
                                    {ACTIVITIES.map(act => <option key={act.name} value={act.name}>{act.icon} {act.name}</option>)}
                                </select>
                            </div>

                            {dayState.done && (
                                <div className="mt-4 flex gap-2">
                                    {MOODS.map((mood, moodIndex) => (
                                        <button key={mood.icon} onClick={() => onSetMood(dayIndex, moodIndex)} className={`flex-1 text-2xl py-1 rounded-lg border transition-all duration-200 transform hover:-translate-y-0.5 ${dayState.mood === moodIndex ? 'bg-blue-500 border-blue-500 scale-105 shadow-lg' : 'bg-slate-100 dark:bg-gray-700 border-slate-200 dark:border-gray-600 opacity-60 hover:opacity-100'}`}>
                                            {mood.icon}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4">
                                <textarea
                                    value={dayState.note}
                                    onChange={(e) => onNoteChange(dayIndex, e.target.value)}
                                    placeholder="Vos pensées, faim, énergie..."
                                    className="w-full bg-slate-100 dark:bg-gray-900/50 border border-slate-200 dark:border-gray-600 rounded-md p-2 text-sm text-slate-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={2}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

interface SummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    days: DayState[];
}
const SummaryModal: React.FC<SummaryModalProps> = ({ isOpen, onClose, days }) => {
    if (!isOpen) return null;
    const doneCount = days.slice(0, 5).filter(d => d.done).length;
    const activityCount = days.filter(d => d.activityDone).length;
    const moods = days.slice(0, 5).filter(d => d.mood !== null).map(d => d.mood!);
    const avgMoodIndex = moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : 1;
    const title = doneCount === 5 ? "🎉 Objectif atteint !" : "✅ Bilan de la Semaine";
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 grid place-items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center transform transition-transform scale-95 animate-in fade-in-0 zoom-in-95">
                <h2 className="text-2xl font-extrabold mb-4 text-slate-800 dark:text-gray-100">{title}</h2>
                <div className="text-slate-600 dark:text-gray-300 space-y-2">
                    <p>Vous avez validé <b>{doneCount}/5</b> jours de jeûne.</p>
                    {activityCount > 0 && <p>Et bravo pour les <b>{activityCount} activité(s) physique(s)</b> !</p>}
                    {moods.length > 0 && <p className="mt-4">Ressenti global : <b>{MOODS[avgMoodIndex].icon} {MOODS[avgMoodIndex].label}</b></p>}
                </div>
                <button onClick={onClose} className="mt-8 w-full px-8 py-3 text-lg font-bold text-white bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full shadow-lg hover:scale-105 transition-transform">Go Semaine Suivante</button>
            </div>
        </div>
    );
};

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: WeekHistory[];
}
const HistoryModal: React.FC<HistoryModalProps> = ({isOpen, onClose, history}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 grid place-items-center p-4">
             <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full relative transform transition-transform scale-95 animate-in fade-in-0 zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white transition">
                    <CloseIcon />
                </button>
                <h2 className="text-2xl font-extrabold mb-4 text-slate-800 dark:text-gray-100">📚 Historique</h2>
                <ul className="max-h-[60vh] overflow-y-auto space-y-2 pr-2">
                    {history.length > 0 ? [...history].reverse().map(weekData => {
                        const fasts = weekData.days.slice(0, 5).filter(d => d.done).length;
                        const activities = weekData.days.filter(d => d.activityDone).length;
                        return (
                            <li key={weekData.week} className="p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg border border-slate-200 dark:border-gray-700">
                                <p className="font-bold text-slate-800 dark:text-gray-100">Semaine {weekData.week}</p>
                                <p className="text-sm text-slate-500 dark:text-gray-400">Jeûnes : {fasts}/5 &nbsp;&nbsp;•&nbsp;&nbsp; Activités : {activities}</p>
                            </li>
                        )
                    }) : <li className="p-4 text-center text-slate-500 dark:text-gray-400">Aucune semaine terminée pour le moment.</li>}
                </ul>
            </div>
        </div>
    )
}

interface DailyCoachProps {
    state: { status: 'idle' | 'loading' | 'success' | 'error'; message: string };
    onAsk: () => void;
}
const DailyCoach: React.FC<DailyCoachProps> = ({ state, onAsk }) => {
    return (
        <div className="space-y-3">
            <button
                onClick={onAsk}
                disabled={state.status === 'loading'}
                className="w-full text-center py-3 px-6 font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
            >
                <RobotIcon className="w-5 h-5"/>
                Coach du Jour
            </button>
            {state.status !== 'idle' && (
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-slate-200 dark:border-gray-700 animate-in fade-in-0">
                    <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-slate-700 dark:text-gray-200">
                        <RobotIcon className="w-5 h-5 text-purple-500"/>
                        Message du Coach
                    </h3>
                    {state.status === 'loading' && (
                        <p className="text-sm text-slate-500 dark:text-gray-400">{state.message}</p>
                    )}
                    {state.status === 'success' && (
                        <p className="text-sm text-slate-600 dark:text-gray-300 whitespace-pre-wrap">{state.message}{state.message.length > 0 && state.status === 'success' && <span className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse"></span>}</p>
                    )}
                    {state.status === 'error' && (
                        <p className="text-sm text-red-500">{state.message}</p>
                    )}
                </div>
            )}
        </div>
    );
};


// --- Main App Component ---

const App: React.FC = () => {
    const supabase = useMemo(() => {
        if (window.supabase) {
            const { createClient } = window.supabase;
            const supabaseUrl = 'https://gjfkuflstdvvwmmxctpp.supabase.co';
            const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZmt1ZmxzdGR2dndtbXhjdHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwODg5MjEsImV4cCI6MjA3NjY2NDkyMX0.qH3qW2R_ntvi9w8uKLPyARyf52hNVq0apkCsAnLHVak';
            return createClient(supabaseUrl, supabaseAnonKey);
        }
        return null;
    }, []);
    
    const ai = useMemo(() => {
        // Assume process.env.API_KEY is available in the execution environment
        return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }, []);

    const [state, setState] = useState<'loading' | AppState>('loading');
    const [setupError, setSetupError] = useState<any | null>(null);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'error'>('synced');
    const [isSummaryModalOpen, setSummaryModalOpen] = useState(false);
    const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
    const [dailyCoachState, setDailyCoachState] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
    const stateRef = useRef(state);

    const sfx = {
        check: useRef<HTMLAudioElement>(null),
        activity: useRef<HTMLAudioElement>(null),
        win: useRef<HTMLAudioElement>(null),
    };

    useEffect(() => {
        stateRef.current = state;
        if (state !== 'loading') {
            document.documentElement.classList.toggle('dark', state.theme === 'dark');
        }
    }, [state]);

    // Load data from Supabase on mount
    useEffect(() => {
        if (!supabase) {
            console.error("Le client Supabase n'a pas pu être chargé.");
            setSetupError({ message: "Le client Supabase n'a pas pu être chargé. Vérifiez votre connexion internet et rechargez la page." });
            return;
        }

        const fetchState = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('app_state')
                .eq('id', USER_ID)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
                console.error('Erreur de chargement Supabase. Message:', error.message);
                console.error('Objet d\'erreur complet:', error);
                setSetupError(error);
                setSyncStatus('error');
            } else if (data && data.app_state) {
                 const validatedState: AppState = { // Basic validation
                    ...data.app_state,
                    days: data.app_state.days.map((d: Partial<DayState>) => ({
                        done: d.done ?? false,
                        mood: d.mood ?? null,
                        selectedActivity: d.selectedActivity ?? 'Aucune',
                        activityDone: d.activityDone ?? false,
                        note: d.note ?? '',
                    })),
                };
                setState(validatedState);
                setSyncStatus('synced');
            } else { // No data, initialize a fresh state
                setState({
                    week: 1,
                    theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
                    days: Array(7).fill(null).map(() => ({ done: false, mood: null, selectedActivity: 'Aucune', activityDone: false, note: '' })),
                    history: [],
                });
                setSyncStatus('synced');
            }
        };
        fetchState();
    }, [supabase]);

    // Debounced save to Supabase
    useEffect(() => {
        if (state === 'loading' || !supabase) return;
        setSyncStatus('saving');
        const handler = setTimeout(async () => {
            const latestState = stateRef.current;
            if (latestState !== 'loading') {
                const { error } = await supabase
                    .from('profiles')
                    .upsert({ id: USER_ID, app_state: latestState, updated_at: new Date() });
                if (error) {
                    console.error('Erreur de sauvegarde Supabase. Message:', error.message);
                    console.error('Objet d\'erreur complet:', error);
                    setSyncStatus('error');
                } else {
                    setSyncStatus('synced');
                }
            }
        }, 1000);

        return () => clearTimeout(handler);
    }, [state, supabase]);
    
    const handleThemeToggle = useCallback(() => {
        setState(prevState => (prevState !== 'loading' ? { ...prevState, theme: prevState.theme === 'light' ? 'dark' : 'light' } : prevState));
    }, []);
    
    const handleToggleDone = useCallback((index: number, el: HTMLElement) => {
        setState(prevState => {
            if (prevState === 'loading') return prevState;
            const newDays = [...prevState.days];
            const isDone = !newDays[index].done;
            newDays[index] = { ...newDays[index], done: isDone, mood: isDone ? newDays[index].mood : null };
            if (isDone) {
                playSound(sfx.check);
                const color = DAY_DESCRIPTIONS[index].rest ? '#ec4899' : '#10b981';
                popConfetti(el, color);
            }
            return { ...prevState, days: newDays };
        });
    }, [sfx.check]);

    const handleSetMood = useCallback((index: number, mood: number) => {
        setState(prevState => {
            if (prevState === 'loading') return prevState;
            const newDays = [...prevState.days];
            newDays[index] = { ...newDays[index], mood: mood };
            return { ...prevState, days: newDays };
        });
    }, []);

    const handleActivityChange = useCallback((index: number, activity: string) => {
        setState(prevState => {
            if (prevState === 'loading') return prevState;
            const newDays = [...prevState.days];
            newDays[index] = { ...newDays[index], selectedActivity: activity, activityDone: false };
            return { ...prevState, days: newDays };
        });
    }, []);

    const handleToggleActivityDone = useCallback((index: number, el: HTMLElement) => {
        setState(prevState => {
            if (prevState === 'loading' || prevState.days[index].selectedActivity === "Aucune") return prevState;
            const newDays = [...prevState.days];
            const isActivityDone = !newDays[index].activityDone;
            newDays[index] = { ...newDays[index], activityDone: isActivityDone };
            if (isActivityDone) {
                playSound(sfx.activity);
                popConfetti(el, '#3b82f6');
            }
            return { ...prevState, days: newDays };
        });
    }, [sfx.activity]);

    const handleNoteChange = useCallback((index: number, note: string) => {
        setState(prevState => {
            if (prevState === 'loading') return prevState;
            const newDays = [...prevState.days];
            newDays[index] = { ...newDays[index], note: note };
            return { ...prevState, days: newDays };
        });
    }, []);

    const handleValidateWeek = useCallback(() => {
        if (state === 'loading') return;
        const doneCount = state.days.slice(0, 5).filter(d => d.done).length;
        if (doneCount === 5) {
            playSound(sfx.win);
            window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
        setSummaryModalOpen(true);
    }, [state, sfx.win]);

    const handleNextWeek = useCallback(() => {
        setState(prevState => {
            if (prevState === 'loading') return prevState;
            const newHistory = [...prevState.history, { week: prevState.week, days: prevState.days }];
            return {
                ...prevState,
                week: prevState.week + 1,
                days: Array(7).fill(null).map(() => ({ done: false, mood: null, selectedActivity: "Aucune", activityDone: false, note: "" })),
                history: newHistory,
            };
        });
        setSummaryModalOpen(false);
        setDailyCoachState({ status: 'idle', message: '' }); // Reset AI coach
    }, []);

    const handleAskDailyCoach = useCallback(async () => {
        if (state === 'loading') return;
    
        setDailyCoachState({ status: 'loading', message: 'Le coach écrit...' });
    
        try {
            let currentDayIndex = new Date().getDay() - 1;
            if (currentDayIndex === -1) currentDayIndex = 6;
    
            const today = state.days[currentDayIndex];
            const dayDesc = DAY_DESCRIPTIONS[currentDayIndex];
    
            if (dayDesc.rest) {
                setDailyCoachState({ status: 'success', message: 'Aujourd\'hui, c\'est repos ! Profitez-en pour bien recharger les batteries. Pas de coaching nécessaire, juste de la détente ! 😊' });
                return;
            }
    
            let statusText = today.done ? "a validé son jeûne." : "n'a pas encore validé son jeûne.";
            let activityText = "Aucune activité n'est prévue.";
            if (today.selectedActivity !== 'Aucune') {
                activityText = `L'activité prévue est "${today.selectedActivity}" et elle ${today.activityDone ? 'a été faite' : 'n\'a pas encore été faite'}.`;
            }
            let moodText = today.done && today.mood !== null ? `Son humeur du jour est : ${MOODS[today.mood].label}.` : "Son humeur n'est pas encore enregistrée.";
            let noteText = today.note ? `Voici sa note personnelle : "${today.note}"` : "Il/elle n'a pas laissé de note.";

            const prompt = `Tu es un coach en jeûne intermittent, amical, concis et motivant. Voici le statut de l'utilisateur pour aujourd'hui (${dayDesc.t}):
- Statut du jeûne : ${statusText}
- Activité : ${activityText}
- Humeur : ${moodText}
- Note : ${noteText}

Donne-lui un court conseil (2-3 phrases) pour la journée en cours ou pour l'aider à atteindre ses objectifs du jour. Sois positif, encourageant et réponds en français. Ne donne pas de conseils médicaux.`;

            const stream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
    
            setDailyCoachState({ status: 'success', message: '' });
    
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk.text;
                setDailyCoachState({ status: 'success', message: fullText });
            }
    
        } catch (error) {
            console.error("Erreur du Coach AI:", error);
            setDailyCoachState({ status: 'error', message: 'Désolé, une erreur est survenue. Réessayez plus tard.' });
        }
    }, [state, ai]);

    if (setupError) {
        return <SupabaseSetupModal error={setupError} />;
    }

    if (state === 'loading') {
        return <LoadingOverlay />;
    }
    
    const doneCount = state.days.slice(0,5).filter(d => d.done).length;

    return (
        <div className="bg-slate-100 dark:bg-gray-900 min-h-screen text-slate-800 dark:text-gray-200 transition-colors pb-12">
            <audio ref={sfx.check} src="https://cdn.freesound.org/previews/242/242501_4414128-lq.mp3" preload="auto"></audio>
            <audio ref={sfx.activity} src="https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3" preload="auto"></audio>
            <audio ref={sfx.win} src="https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3" preload="auto"></audio>

            <div className="container mx-auto max-w-5xl p-4">
                <TopBar theme={state.theme} onThemeToggle={handleThemeToggle} />
                <Dashboard week={state.week} days={state.days} historyLength={state.history.length} onShowHistory={() => setHistoryModalOpen(true)}/>

                <main className="grid md:grid-cols-3 gap-8 items-start">
                    <section className="md:col-span-2">
                        <h2 className="text-2xl font-extrabold mb-2 text-slate-800 dark:text-gray-100">Semaine {state.week}</h2>
                        <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
                            <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(doneCount / 5) * 100}%` }}></div>
                        </div>
                        <div className="space-y-4">
                            {state.days.map((dayState, i) => (
                                <DayCard key={i} dayIndex={i} dayState={dayState} onToggleDone={handleToggleDone} onSetMood={handleSetMood} onActivityChange={handleActivityChange} onToggleActivityDone={handleToggleActivityDone} onNoteChange={handleNoteChange} />
                            ))}
                        </div>
                    </section>
                    <aside className="space-y-4 md:sticky md:top-4">
                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-slate-200 dark:border-gray-700">
                             <h2 className="text-xl font-extrabold mb-4 text-slate-800 dark:text-gray-100">📚 Info & Astuces</h2>
                             <details className="text-sm text-slate-600 dark:text-gray-300 py-2 border-b border-slate-200 dark:border-gray-700"><summary className="font-semibold cursor-pointer">Rythme 21h-12h explication</summary><p className="pt-2">Vous jeûnez de 21h le soir jusqu'à midi le lendemain (15 heures). Vous mangez entre midi et 21h (9 heures). C'est un rythme "15/9", excellent pour la vie sociale et sportive.</p></details>
                             <details className="text-sm text-slate-600 dark:text-gray-300 py-2 border-b border-slate-200 dark:border-gray-700"><summary className="font-semibold cursor-pointer">Gérer la faim le matin</summary><p className="pt-2">C'est souvent une habitude hormonale (ghréline). Buvez de l'eau, café noir ou thé. La sensation passe en 15min environ.</p></details>
                             <details className="text-sm text-slate-600 dark:text-gray-300 py-2 border-b border-slate-200 dark:border-gray-700"><summary className="font-semibold cursor-pointer">Boissons autorisées</summary><p className="pt-2">Eau (plate/gazeuse), café noir, thés, tisanes. PAS de sucre, pas de miel, pas de lait (ou une micro goutte si indispensable au début). Pas de jus.</p></details>
                             <details className="text-sm text-slate-600 dark:text-gray-300 py-2"><summary className="font-semibold cursor-pointer">Repas de 12h idéal</summary><p className="pt-2">Rompez le jeûne en douceur. Protéines (poulet, œufs, poisson), légumes, et bons gras (avocat, huile olive). Évitez une "bombe de sucre".</p></details>
                        </div>
                        
                        <DailyCoach state={dailyCoachState} onAsk={handleAskDailyCoach} />

                        <div className="space-y-3">
                            <button onClick={handleValidateWeek} className="w-full text-center py-3 px-6 font-bold text-white bg-emerald-500 rounded-full shadow-lg hover:bg-emerald-600 transition-all hover:scale-105">✅ Valider et finir la semaine</button>
                        </div>
                        <div className="flex flex-col items-center gap-3 pt-2">
                             <a href="https://github.com/thomasmoroy/coach-jeune" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-gray-400 hover:underline">
                                <GitHubIcon />
                                Projet sur GitHub
                            </a>
                            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-gray-400 hover:underline">
                                <SupabaseIcon className="text-emerald-500"/>
                                Powered by Supabase
                            </a>
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400 mt-1">
                                {syncStatus === 'synced' && <><div className="w-2 h-2 rounded-full bg-emerald-500 motion-safe:animate-pulse [animation-iteration-count:1] [animation-duration:1.5s]"></div><span>Synchronisé</span></>}
                                {syncStatus === 'saving' && <><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div><span>Sauvegarde...</span></>}
                                {syncStatus === 'error' && <><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-red-500">Erreur de synchro</span></>}
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
            <SummaryModal isOpen={isSummaryModalOpen} onClose={handleNextWeek} days={state.days} />
            <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setHistoryModalOpen(false)} history={state.history} />
        </div>
    );
};

export default App;