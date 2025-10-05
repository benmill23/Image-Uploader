import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function ScoreDisplay({ analysisResult, dailyStreak = 0 }) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (analysisResult?.success) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [analysisResult]);

  if (!analysisResult || !analysisResult.success || !analysisResult.isRelevant) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 font-medium">
          This doesn't look like a valid sample!
        </p>
        <p className="text-yellow-600 text-sm mt-2">
          Try uploading a clearer image for analysis.
        </p>
      </div>
    );
  }

  const { bristolScore, sizeEstimation, healthIndicators, warnings } = analysisResult;

  // Bristol Scale friendly descriptions
  const bristolInfo = {
    1: { name: 'Very Hard', desc: 'Too hard! Drink more water', color: 'red' },
    2: { name: 'Slightly Hard', desc: 'A bit lumpy, hydrate more', color: 'orange' },
    3: { name: 'Normal', desc: "You're doing great!", color: 'green' },
    4: { name: 'Optimal', desc: 'Absolute champion!', color: 'green' },
    5: { name: 'Soft', desc: 'Getting loose, watch your diet', color: 'yellow' },
    6: { name: 'Very Soft', desc: 'Too soft! Check hydration', color: 'orange' },
    7: { name: 'Liquid', desc: 'Very loose! Stay hydrated', color: 'red' },
  };

  const currentBristol = bristolInfo[bristolScore] || { name: 'Unknown', desc: 'Unable to analyze', color: 'gray' };

  // Size estimation display
  const sizeInfo = {
    small: { percentage: 33, label: 'Compact', color: 'blue' },
    medium: { percentage: 66, label: 'Just Right', color: 'green' },
    large: { percentage: 100, label: 'Impressive', color: 'purple' },
  };

  const currentSize = sizeInfo[sizeEstimation?.toLowerCase()] || sizeInfo.medium;

  // Health badges
  const badges = [
    {
      id: 'hydration',
      unlocked: healthIndicators?.dehydration === false,
      name: 'Hydration Hero',
      desc: 'Well hydrated!',
    },
    {
      id: 'healthy',
      unlocked: healthIndicators?.bloodPresence === false && healthIndicators?.unusualColor === false,
      name: 'Health Champion',
      desc: 'No concerning signs',
    },
    {
      id: 'consistent',
      unlocked: healthIndicators?.consistencyIssues === false,
      name: 'Consistency King',
      desc: 'Perfect consistency',
    },
    {
      id: 'streak',
      unlocked: dailyStreak >= 3,
      name: `${dailyStreak} Day Streak`,
      desc: 'Keep logging daily!',
    },
  ];

  // Color mapping
  const colorClasses = {
    red: 'bg-red-100 border-red-300 text-red-800',
    orange: 'bg-orange-100 border-orange-300 text-orange-800',
    yellow: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    green: 'bg-green-100 border-green-300 text-green-800',
    blue: 'bg-blue-100 border-blue-300 text-blue-800',
    purple: 'bg-purple-100 border-purple-300 text-purple-800',
    gray: 'bg-gray-100 border-gray-300 text-gray-800',
  };

  // Encouraging messages
  const getEncouragingMessage = () => {
    if (bristolScore >= 3 && bristolScore <= 4) {
      return "Fantastic! You're in the optimal zone!";
    }
    if (bristolScore === 1 || bristolScore === 2) {
      return "Add more fiber and water to level up!";
    }
    if (bristolScore >= 5) {
      return "Your gut needs some TLC - you've got this!";
    }
    return "Keep tracking to see your progress!";
  };

  return (
    <div className={`space-y-6 ${showAnimation ? 'animate-pulse' : ''}`}>
      {/* Main Score Card */}
      <div className={`${colorClasses[currentBristol.color]} border-2 rounded-lg p-6 text-center transition-all`}>
        <h3 className="text-2xl font-bold mb-1">{currentBristol.name}</h3>
        <p className="text-lg mb-2">Bristol Scale: {bristolScore}/7</p>
        <p className="text-sm opacity-90">{currentBristol.desc}</p>
      </div>

      {/* Encouraging Message */}
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 rounded-lg p-4 text-center">
        <p className="text-purple-800 font-medium">{getEncouragingMessage()}</p>
      </div>

      {/* Size Score */}
      {sizeEstimation && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-gray-800">Size Score</h4>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                currentSize.color === 'blue' ? 'bg-blue-500' :
                currentSize.color === 'green' ? 'bg-green-500' :
                'bg-purple-500'
              }`}
              style={{ width: `${currentSize.percentage}%` }}
            />
          </div>
          <p className="text-center text-gray-600 mt-2 text-sm">{currentSize.label}</p>
        </div>
      )}

      {/* Health Badges */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          Health Achievements
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-4 rounded-lg border-2 text-center transition-all ${
                badge.unlocked
                  ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300'
                  : 'bg-gray-50 border-gray-200 opacity-50'
              }`}
            >
              <p className="font-semibold text-sm text-gray-800">{badge.name}</p>
              <p className="text-xs text-gray-600 mt-1">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Streak */}
      <div className="bg-gradient-to-r from-orange-100 to-red-100 border-2 border-orange-300 rounded-lg p-6 text-center">
        <h4 className="text-xl font-bold text-orange-800 mb-1">
          {dailyStreak} Day Streak
        </h4>
        <p className="text-sm text-orange-700">
          {dailyStreak === 0 ? 'Start your journey today!' :
           dailyStreak < 3 ? 'Keep going!' :
           dailyStreak < 7 ? 'Great consistency!' :
           'Incredible dedication!'}
        </p>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 mb-2">
            Health Alerts
          </h4>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="text-sm text-red-700">
                • {warning}
              </li>
            ))}
          </ul>
          <p className="text-xs text-red-600 mt-3 italic">
            Consider consulting a healthcare professional if concerns persist.
          </p>
        </div>
      )}

      {/* Fun Stats Footer */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold text-gray-800">{bristolScore}</p>
            <p className="text-xs text-gray-600">Bristol</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">
              {badges.filter(b => b.unlocked).length}/{badges.length}
            </p>
            <p className="text-xs text-gray-600">Badges</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{dailyStreak}</p>
            <p className="text-xs text-gray-600">Days</p>
          </div>
        </div>
      </div>
    </div>
  );
}

ScoreDisplay.propTypes = {
  analysisResult: PropTypes.shape({
    success: PropTypes.bool,
    isRelevant: PropTypes.bool,
    bristolScore: PropTypes.number,
    sizeEstimation: PropTypes.string,
    healthIndicators: PropTypes.shape({
      dehydration: PropTypes.bool,
      bloodPresence: PropTypes.bool,
      unusualColor: PropTypes.bool,
      consistencyIssues: PropTypes.bool,
    }),
    warnings: PropTypes.arrayOf(PropTypes.string),
  }),
  dailyStreak: PropTypes.number,
};
