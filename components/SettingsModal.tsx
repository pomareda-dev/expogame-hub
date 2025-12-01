import React, { useState, useEffect } from "react";
import { X, Save, RotateCcw } from "lucide-react";
import {
  useGameSettings,
  GameSettings,
  DEFAULT_SETTINGS,
} from "../utils/gameSettings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { settings, updateSettings } = useGameSettings();
  const [localSettings, setLocalSettings] = useState<GameSettings>(settings);
  const [activeTab, setActiveTab] = useState<keyof GameSettings>("connectFour");

  // Sync local state when modal opens or settings change externally
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all settings to default?")) {
      setLocalSettings(DEFAULT_SETTINGS);
    }
  };

  const handleChange = (
    category: keyof GameSettings,
    field: string,
    value: number
  ) => {
    setLocalSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const tabs: { id: keyof GameSettings; label: string }[] = [
    { id: "connectFour", label: "Connect Four" },
    { id: "flappyBird", label: "Flappy Drone" },
    { id: "catcher", label: "Catcher" },
    { id: "memory", label: "Memory" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Game Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-white/10 px-6 gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-brand-500 text-brand-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTab === "connectFour" && (
              <>
                <SettingInput
                  label="Rows"
                  value={localSettings.connectFour.rows}
                  onChange={(v) => handleChange("connectFour", "rows", v)}
                  min={4}
                  max={10}
                />
                <SettingInput
                  label="Columns"
                  value={localSettings.connectFour.cols}
                  onChange={(v) => handleChange("connectFour", "cols", v)}
                  min={4}
                  max={10}
                />
                <SettingInput
                  label="Margin Top (px)"
                  value={localSettings.connectFour.marginTop}
                  onChange={(v) => handleChange("connectFour", "marginTop", v)}
                  min={-200}
                  max={200}
                  step={10}
                />
              </>
            )}

            {activeTab === "flappyBird" && (
              <>
                <SettingInput
                  label="Bird Size"
                  value={localSettings.flappyBird.birdSize}
                  onChange={(v) => handleChange("flappyBird", "birdSize", v)}
                  min={10}
                  max={50}
                />
                <SettingInput
                  label="Gravity"
                  value={localSettings.flappyBird.gravity}
                  onChange={(v) => handleChange("flappyBird", "gravity", v)}
                  min={0.1}
                  max={1.0}
                  step={0.1}
                />
                <SettingInput
                  label="Jump Strength"
                  value={localSettings.flappyBird.jumpStrength}
                  onChange={(v) =>
                    handleChange("flappyBird", "jumpStrength", v)
                  }
                  min={-20}
                  max={-1}
                  step={0.5}
                />
                <SettingInput
                  label="Obstacle Width"
                  value={localSettings.flappyBird.obstacleWidth}
                  onChange={(v) =>
                    handleChange("flappyBird", "obstacleWidth", v)
                  }
                  min={20}
                  max={100}
                />
                <SettingInput
                  label="Obstacle Gap"
                  value={localSettings.flappyBird.obstacleGap}
                  onChange={(v) => handleChange("flappyBird", "obstacleGap", v)}
                  min={100}
                  max={400}
                />
                <SettingInput
                  label="Speed"
                  value={localSettings.flappyBird.obstacleSpeed}
                  onChange={(v) =>
                    handleChange("flappyBird", "obstacleSpeed", v)
                  }
                  min={1}
                  max={10}
                  step={0.5}
                />
              </>
            )}

            {activeTab === "catcher" && (
              <>
                <SettingInput
                  label="Fall Speed Base"
                  value={localSettings.catcher.fallSpeed}
                  onChange={(v) => handleChange("catcher", "fallSpeed", v)}
                  min={1}
                  max={10}
                  step={0.5}
                />
                <SettingInput
                  label="Max Time (s)"
                  value={localSettings.catcher.maxTime}
                  onChange={(v) => handleChange("catcher", "maxTime", v)}
                  min={10}
                  max={300}
                  step={10}
                />
              </>
            )}

            {activeTab === "memory" && (
              <>
                <SettingInput
                  label="Container Padding (px)"
                  value={localSettings.memory.padding}
                  onChange={(v) => handleChange("memory", "padding", v)}
                  min={0}
                  max={100}
                  step={4}
                />
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between items-center bg-slate-800/50 rounded-b-2xl">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shadow-lg shadow-brand-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const SettingInput: React.FC<SettingInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-400">{label}</label>
      <div className="flex gap-4 items-center">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-20 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>
    </div>
  );
};
