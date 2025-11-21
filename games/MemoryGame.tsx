import React, { useState, useEffect } from 'react';
import { GameLayout } from '../components/GameLayout';
import { ResultModal } from '../components/ResultModal';
import { Button } from '../components/Button';
import { GameStatus } from '../types';

const ICONS = ['🚀', '🎮', '🎧', '⌚', '📷', '💻', '🔋', '💡'];

interface Card {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export const MemoryGame: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [difficulty, setDifficulty] = useState<'EASY' | 'HARD'>('EASY');

  useEffect(() => {
    if (status === 'PLAYING') {
      initializeDeck();
    }
  }, [status, difficulty]);

  const initializeDeck = () => {
    const iconsToUse = difficulty === 'EASY' ? ICONS.slice(0, 6) : ICONS;
    const deck = [...iconsToUse, ...iconsToUse]
      .sort(() => Math.random() - 0.5)
      .map((icon, index) => ({
        id: index,
        icon,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(deck);
    setFlippedIndices([]);
    setMoves(0);
  };

  const handleCardClick = (index: number) => {
    // Prevent clicking if already matched, already flipped, or 2 cards currently flipped
    if (cards[index].isMatched || cards[index].isFlipped || flippedIndices.length >= 2) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    
    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      checkForMatch(newFlipped[0], newFlipped[1]);
    }
  };

  const checkForMatch = (index1: number, index2: number) => {
    if (cards[index1].icon === cards[index2].icon) {
      // Match!
      setTimeout(() => {
        setCards(prev => prev.map((card, i) => 
          i === index1 || i === index2 ? { ...card, isMatched: true } : card
        ));
        setFlippedIndices([]);
        
        // Check Win
        if (cards.filter(c => !c.isMatched).length <= 2) {
             setStatus('VICTORY');
        }
      }, 500);
    } else {
      // No match
      setTimeout(() => {
        setCards(prev => prev.map((card, i) => 
          i === index1 || i === index2 ? { ...card, isFlipped: false } : card
        ));
        setFlippedIndices([]);
      }, 1000);
    }
  };

  if (status === 'IDLE') {
      return (
        <GameLayout title="Memory Match">
            <div className="flex flex-col items-center justify-center h-full gap-8 animate-pop-in">
                <h2 className="text-4xl font-bold text-white tracking-tight">Select Difficulty</h2>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md px-4">
                    <Button onClick={() => { setDifficulty('EASY'); setStatus('PLAYING'); }} size="lg" className="flex-1 h-24 text-xl">
                        Easy<br/><span className="text-sm opacity-75 font-normal">(12 Cards)</span>
                    </Button>
                    <Button onClick={() => { setDifficulty('HARD'); setStatus('PLAYING'); }} size="lg" variant="secondary" className="flex-1 h-24 text-xl">
                        Hard<br/><span className="text-sm opacity-75 font-normal">(16 Cards)</span>
                    </Button>
                </div>
            </div>
        </GameLayout>
      );
  }

  return (
    <GameLayout title="Memory Match">
      <div className="flex flex-col items-center h-full w-full p-2 md:p-4">
        <div className="flex justify-between w-full max-w-6xl mb-4 px-2">
            <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-white/10">
                <span className="text-slate-400 text-sm uppercase font-bold mr-2">Moves</span>
                <span className="text-white font-bold font-mono text-xl">{moves}</span>
            </div>
            <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-white/10">
                <span className="text-slate-400 text-sm uppercase font-bold mr-2">Pairs</span>
                <span className="text-white font-bold font-mono text-xl">{cards.filter(c => c.isMatched).length / 2} / {cards.length / 2}</span>
            </div>
        </div>

        {/* Grid Container: expanded to fill vertical space with flex-1 */}
        <div className={`grid w-full max-w-6xl flex-1 gap-2 sm:gap-4 mb-2 ${difficulty === 'EASY' ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              disabled={card.isMatched || card.isFlipped}
              className={`relative w-full h-full rounded-2xl transition-all duration-300 transform perspective-1000 group ${
                card.isFlipped || card.isMatched ? 'rotate-y-180' : 'hover:scale-[1.02] active:scale-95'
              }`}
            >
               {/* Card Back (Hidden) */}
               <div className={`absolute inset-0 bg-slate-700 rounded-2xl border-b-4 border-slate-900 shadow-lg flex items-center justify-center backface-hidden transition-opacity duration-300 ${card.isFlipped || card.isMatched ? 'opacity-0' : 'opacity-100'}`}>
                   <span className="text-4xl opacity-10 group-hover:opacity-30 transition-opacity">?</span>
               </div>
               
               {/* Card Front (Visible) */}
               <div className={`absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl border-b-4 border-brand-800 flex items-center justify-center shadow-lg backface-hidden transition-opacity duration-300 ${card.isFlipped || card.isMatched ? 'opacity-100' : 'opacity-0'}`}>
                   <span className="text-5xl sm:text-6xl drop-shadow-md animate-pop-in">{card.icon}</span>
               </div>
            </button>
          ))}
        </div>
      </div>

      <ResultModal 
        isOpen={status === 'VICTORY'}
        title="Memory Master!"
        message={`You cleared the board in ${moves} moves.`}
        isVictory={true}
        onRetry={() => setStatus('IDLE')}
      />
    </GameLayout>
  );
};