
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Level, Topic, Message, UserSettings } from './types';
import { getAIResponse, generateSpeech, validateApiKey, saveApiKey, getSavedApiKey, clearApiKey } from './services/gemini';
import { decodeBase64, decodeAudioData } from './utils/audio';
import {
  Bars3BottomLeftIcon,
  ArrowPathIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  AcademicCapIcon,
  LanguageIcon,
  CheckCircleIcon,
  SparklesIcon,
  StopIcon,
  MapPinIcon,
  CakeIcon,
  ShoppingBagIcon,
  TruckIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  ExclamationCircleIcon,
  HomeIcon,
  ChatBubbleLeftRightIcon,
  PlayIcon
} from '@heroicons/react/24/solid';
import { KeyIcon, ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const topicConfig = [
  { id: Topic.GENERAL, name: '일반 대화', icon: ChatBubbleLeftRightIcon, color: 'bg-blue-500', desc: '자유로운 일상 대화' },
  { id: Topic.SIGHTSEEING, name: '관광지 탐방', icon: MapPinIcon, color: 'bg-emerald-500', desc: '길 찾기 및 명소 안내' },
  { id: Topic.RESTAURANT, name: '음식점 이용', icon: CakeIcon, color: 'bg-orange-500', desc: '주문, 예약, 맛 표현' },
  { id: Topic.TRANSPORT, name: '대중교통', icon: TruckIcon, color: 'bg-cyan-500', desc: '티켓 구매 및 노선 문의' },
  { id: Topic.SHOPPING, name: '쇼핑과 환불', icon: ShoppingBagIcon, color: 'bg-pink-500', desc: '가격 흥정 및 사이즈 문의' },
  { id: Topic.HOTEL, name: '호텔 숙박', icon: HomeIcon, color: 'bg-purple-500', desc: '체크인 및 서비스 요청' },
  { id: Topic.TRAVEL, name: '여행 계획', icon: SparklesIcon, color: 'bg-indigo-500', desc: '일정 짜기 및 준비물' },
  { id: Topic.BUSINESS, name: '비즈니스', icon: BriefcaseIcon, color: 'bg-slate-700', desc: '미팅 및 이메일 표현' },
  { id: Topic.EMERGENCY, name: '긴급 상황', icon: ExclamationCircleIcon, color: 'bg-red-500', desc: '병원 및 도움 요청' },
];

const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTopicSelector, setShowTopicSelector] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [inputLang, setInputLang] = useState<'en-US' | 'ko-KR'>('en-US');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('ai_teacher_settings');
    return saved ? JSON.parse(saved) : {
      level: Level.BEGINNER,
      topic: Topic.GENERAL,
      voice: 'Kore'
    };
  });

  // API 키 관련 상태
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');

  // 앱 로드 시 API 키 확인
  useEffect(() => {
    const savedKey = getSavedApiKey();
    if (savedKey && savedKey.length > 10) {
      setHasApiKey(true);
    }
  }, []);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionInstance = useRef<any>(null);
  const transcriptBuffer = useRef<string>('');

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, interimTranscript, scrollToBottom]);

  const stopAudio = useCallback(() => {
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (e) { }
      currentSourceRef.current = null;
    }
    setCurrentlyPlayingId(null);
    setPreviewingVoice(null);
  }, []);

  const handleSend = useCallback(async (text: string, isInitial = false) => {
    const trimmedText = text.trim();
    if (!trimmedText && !isInitial) return;

    const userMsgId = Date.now().toString();

    if (!isInitial) {
      const userMsg: Message = {
        id: userMsgId,
        role: 'user',
        content: trimmedText,
        timestamp: Date.now()
      };
      setMessages(prev => {
        const next = [...prev, userMsg];
        localStorage.setItem('ai_teacher_chat', JSON.stringify(next));
        return next;
      });
      setInput('');
      transcriptBuffer.current = '';
    }

    setLoading(true);
    try {
      const history = isInitial ? [] : messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model' as 'user' | 'model',
        parts: [{ text: m.content }]
      }));

      const aiText = await getAIResponse(trimmedText, history, settings.level, settings.topic);
      const aiMsgId = (Date.now() + 1).toString();
      const aiMsg: Message = {
        id: aiMsgId,
        role: 'assistant',
        content: aiText || '죄송합니다. 답변을 생성할 수 없습니다.',
        timestamp: Date.now(),
        hasAudio: true
      };

      setMessages(prev => {
        const next = [...prev, aiMsg];
        localStorage.setItem('ai_teacher_chat', JSON.stringify(next));
        return next;
      });

      if (aiText) {
        const audioData = await generateSpeech(aiText, settings.voice);
        if (audioData) {
          await playAudio(audioData, aiMsgId);
        }
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: error.message || "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        timestamp: Date.now()
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, settings]);

  const playAudio = async (base64: string, id: string, isPreview = false, playbackRate = 1.0) => {
    try {
      stopAudio();
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const data = decodeBase64(base64);
      const audioBuffer = await decodeAudioData(data, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;  // 재생 속도 설정
      source.connect(ctx.destination);

      source.onended = () => {
        setCurrentlyPlayingId(null);
        setPreviewingVoice(null);
        currentSourceRef.current = null;
      };

      currentSourceRef.current = source;
      if (isPreview) setPreviewingVoice(id);
      else setCurrentlyPlayingId(id);
      source.start();
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionInstance.current?.stop();
      return;
    }

    // 1. 보안 컨텍스트 확인 (중요: HTTPS가 아니면 인식 불가)
    if (!window.isSecureContext) {
      alert("음성 인식은 보안 연결(HTTPS) 환경에서만 작동합니다.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("이 브라우저는 음성 인식을 지원하지 않습니다. 최신 크롬 브라우저를 사용해 주세요.");
      return;
    }

    // 2. 동기적으로 정지 및 시작 시도 (모바일 제스처 유지)
    stopAudio();

    const recognition = new SpeechRecognition();
    recognition.lang = inputLang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
      transcriptBuffer.current = '';
    };

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        transcriptBuffer.current = final;
        setInput(final);
      }
      setInterimTranscript(interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      const finalResult = transcriptBuffer.current.trim();
      if (finalResult) {
        handleSend(finalResult);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      console.error('STT Error:', event.error);
      if (event.error === 'not-allowed') {
        alert("마이크 권한이 거부되었습니다.\n\n해결 방법:\n1. 브라우저 주소창 왼쪽 '자물쇠' 아이콘 클릭\n2. 권한 재설정 또는 마이크 '허용'\n3. 페이지 새로고침");
      }
    };

    recognitionInstance.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.error("Start error:", e);
    }
  };

  const toggleLang = () => {
    setInputLang(prev => prev === 'en-US' ? 'ko-KR' : 'en-US');
  };

  const handleTopicSelection = (topic: Topic) => {
    setSettings(prev => ({ ...prev, topic }));
    setShowTopicSelector(false);
    setMessages([]);
    localStorage.removeItem('ai_teacher_chat');
    const topicName = topicConfig.find(t => t.id === topic)?.name;
    handleSend(`Hi! Let's practice speaking about '${topicName}' at a ${settings.level.split(' ')[0]} level. Shall we begin?`, true);
  };

  const handleLevelChange = (newLevel: Level) => {
    setSettings(prev => ({ ...prev, level: newLevel }));
    if (!showTopicSelector) {
      handleSend(`Level changed to ${newLevel}. Let's continue!`, true);
    }
  };

  const replayMessageAudio = async (messageId: string, text: string, slow = false) => {
    if (currentlyPlayingId === messageId) {
      stopAudio();
      return;
    }
    setLoading(true);
    try {
      const audioData = await generateSpeech(text, settings.voice);
      if (audioData) await playAudio(audioData, messageId, false, slow ? 0.75 : 1.0);
    } finally {
      setLoading(false);
    }
  };

  // 특정 메시지부터 다시 시작하는 함수
  const restartFromMessage = (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // 해당 메시지 이전까지만 유지 (해당 메시지와 이후 메시지 삭제)
    const newMessages = messages.slice(0, messageIndex);
    setMessages(newMessages);
    localStorage.setItem('ai_teacher_chat', JSON.stringify(newMessages));
    stopAudio();
  };

  // API 키 제출 핸들러
  const handleApiKeySubmit = async () => {
    if (!apiKeyInput.trim()) {
      setApiKeyError('API 키를 입력해주세요.');
      return;
    }

    setIsValidatingKey(true);
    setApiKeyError('');

    try {
      const isValid = await validateApiKey(apiKeyInput.trim());
      if (isValid) {
        saveApiKey(apiKeyInput.trim());
        setHasApiKey(true);
        setApiKeyInput('');
      } else {
        setApiKeyError('유효하지 않은 API 키입니다. 다시 확인해주세요.');
      }
    } catch (error) {
      setApiKeyError('API 키 검증 중 오류가 발생했습니다.');
    } finally {
      setIsValidatingKey(false);
    }
  };

  // API 키가 없으면 입력 화면 표시
  if (!hasApiKey) {
    return (
      <div className="flex flex-col h-screen relative overflow-hidden items-center justify-center p-6">
        <div className="glass w-full max-w-md p-8 rounded-3xl space-y-6 shadow-2xl">
          {/* 헤더 */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-xl">
              <KeyIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">AI Teacher Pro</h1>
            <p className="text-slate-500 text-sm">시작하려면 Gemini API 키를 입력해주세요</p>
          </div>

          {/* 입력창 */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                placeholder="AIza..."
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all text-sm font-medium bg-white/80"
              />
            </div>

            {/* 에러 메시지 */}
            {apiKeyError && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <span>{apiKeyError}</span>
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              onClick={handleApiKeySubmit}
              disabled={isValidatingKey || !apiKeyInput.trim()}
              className="w-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              {isValidatingKey ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  검증 중...
                </>
              ) : (
                <>
                  시작하기
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* 안내 링크 */}
          <div className="text-center space-y-2">
            <p className="text-xs text-slate-400">API 키가 없으신가요?</p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-violet-600 font-semibold hover:underline inline-flex items-center gap-1"
            >
              Google AI Studio에서 무료로 발급받기 →
            </a>
          </div>
        </div>

        {/* 하단 장식 텍스트 */}
        <p className="mt-8 text-white/60 text-xs text-center">
          🔒 API 키는 로컬에만 저장되며 외부로 전송되지 않습니다
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen relative overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-80 sidebar z-50 transform transition-all duration-500 ease-out ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5">
            <h2 className="text-xl font-bold gradient-text flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                <AcademicCapIcon className="w-5 h-5 text-white" />
              </div>
              Settings
            </h2>
            <button onClick={() => setSidebarOpen(false)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-110">
              <XMarkIcon className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            <div className="settings-section space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"></span>
                Level
              </h3>
              <div className="grid gap-3">
                {Object.values(Level).map((l) => (
                  <button key={l} onClick={() => handleLevelChange(l)} className={`sidebar-item flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 ${settings.level === l ? 'active border-violet-400/50 bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 shadow-md' : 'border-transparent hover:border-slate-200 text-slate-600'}`}>
                    <span className="font-semibold">{l}</span>
                    {settings.level === l && <CheckCircleIcon className="w-5 h-5 text-violet-500" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Teacher Voice</h3>
              <div className="grid gap-3">
                {voices.map((v) => (
                  <div key={v} className="flex items-center gap-2">
                    <button onClick={() => setSettings(prev => ({ ...prev, voice: v }))} className={`flex-1 flex items-center justify-between p-3 rounded-xl border-2 ${settings.voice === v ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-600'}`}>
                      <span className="font-medium">{v}</span>
                      {settings.voice === v && <CheckCircleIcon className="w-5 h-5 text-blue-500" />}
                    </button>
                    <button onClick={async () => {
                      if (previewingVoice === v) stopAudio();
                      else {
                        setPreviewingVoice(v);
                        const audio = await generateSpeech("Hello, nice to meet you!", v);
                        if (audio) playAudio(audio, v, true);
                      }
                    }} className={`p-3 rounded-xl border-2 ${previewingVoice === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>
                      {previewingVoice === v ? <StopIcon className="w-5 h-5 animate-pulse" /> : <PlayIcon className="w-5 h-5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="p-6 border-t space-y-3">
            <button onClick={() => { if (confirm("초기화하시겠습니까?")) { setMessages([]); setShowTopicSelector(true); stopAudio(); } }} className="w-full py-3 bg-slate-100 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors">
              <ArrowPathIcon className="w-4 h-4" /> Reset Chat
            </button>
            <button
              onClick={() => {
                if (confirm("API 키를 변경하시겠습니까? 기존 키는 삭제됩니다.")) {
                  clearApiKey();
                  setHasApiKey(false);
                  setSidebarOpen(false);
                }
              }}
              className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
            >
              <KeyIcon className="w-4 h-4" /> API 키 변경
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="header-glass sticky top-0 z-30 px-5 h-16 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2.5 rounded-xl hover:bg-slate-100 transition-all duration-200 hover:scale-105 active:scale-95">
          <Bars3BottomLeftIcon className="w-6 h-6 text-slate-600" />
        </button>
        <div className="text-center">
          <h1 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 text-base tracking-tight">AI Teacher Pro</h1>
          {!showTopicSelector && (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-violet-600 font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 animate-pulse"></span>
              {topicConfig.find(t => t.id === settings.topic)?.name}
            </span>
          )}
        </div>
        {!showTopicSelector ? (
          <button onClick={() => setShowTopicSelector(true)} className="flex flex-col items-center gap-0.5 text-violet-600 p-2 rounded-xl hover:bg-violet-50 transition-all duration-200">
            <LanguageIcon className="w-5 h-5" /><span className="text-[8px] font-bold">TOPICS</span>
          </button>
        ) : <div className="w-10" />}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative">
        {showTopicSelector ? (
          <div className="h-full overflow-y-auto p-6 no-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center text-white">
                <h2 className="text-3xl font-black mb-2 drop-shadow-lg">✨ Choose a Topic</h2>
                <p className="text-white/80 text-sm font-medium">상황을 선택하고 영어 회화를 연습해보세요</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pb-10">
                {topicConfig.map((t, index) => (
                  <button
                    key={t.id}
                    onClick={() => handleTopicSelection(t.id)}
                    className="topic-card stagger-item shine-effect bg-white/95 p-5 text-left group"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className={`topic-icon w-12 h-12 ${t.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                      <t.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-violet-600 transition-colors">{t.name}</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-bubble flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-4 text-sm font-medium ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.content.split('\n').map((line, i) => {
                          if (line.includes('Correction:') || line.includes('💡')) return <div key={i} className="mt-3 pt-3 border-t border-emerald-200 text-emerald-600 font-bold text-xs flex items-start gap-1"><span className="emoji-pop">💡</span> {line.replace('💡', '').replace('Correction:', '').trim()}</div>;
                          if (line.includes('🇰🇷') || line.includes('번역:')) return <div key={i} className="mt-3 text-slate-400 text-xs italic bg-slate-50 rounded-lg p-2">{line}</div>;
                          return <p key={i}>{line}</p>;
                        })}
                      </div>
                    </div>
                    {/* 사용자 메시지: 다시 대답 버튼 */}
                    {msg.role === 'user' && (
                      <button
                        onClick={() => restartFromMessage(msg.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 hover:scale-105 active:scale-95 bg-white/20 text-white/80 border border-white/30 hover:bg-white/30"
                      >
                        ↩️ 다시 대답
                      </button>
                    )}
                    {/* AI 응답: LISTEN, SLOW, 다시 시작 버튼 */}
                    {msg.hasAudio && msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => replayMessageAudio(msg.id, msg.content, false)} className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all duration-300 hover:scale-105 active:scale-95 ${currentlyPlayingId === msg.id ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-lg' : 'bg-white/90 text-violet-600 border-violet-200 hover:border-violet-400'}`}>
                          {currentlyPlayingId === msg.id ? <StopIcon className="w-3 h-3" /> : <SpeakerWaveIcon className="w-3 h-3" />}
                          {currentlyPlayingId === msg.id ? 'STOP' : 'LISTEN'}
                        </button>
                        <button onClick={() => replayMessageAudio(msg.id, msg.content, true)} className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all duration-300 hover:scale-105 active:scale-95 bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-400 hover:bg-amber-100">
                          🐢 SLOW
                        </button>
                        <button
                          onClick={() => restartFromMessage(msg.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border-2 transition-all duration-300 hover:scale-105 active:scale-95 bg-rose-50 text-rose-500 border-rose-200 hover:border-rose-400 hover:bg-rose-100"
                        >
                          ↩️ 여기서 다시
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="glass w-24 p-4 rounded-2xl flex gap-2 justify-center shadow-lg">
                  <div className="loading-dot w-2 h-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
                  <div className="loading-dot w-2 h-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
                  <div className="loading-dot w-2 h-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 pt-8 bg-gradient-to-t from-black/20 via-transparent to-transparent">
              <div className="max-w-2xl mx-auto">
                <div className={`chat-input-container flex items-center gap-2 p-2 transition-all duration-300 ${isListening ? 'ring-4 ring-red-400/30 border-red-400' : ''}`}>
                  <button onClick={toggleLang} className={`text-[10px] font-black w-11 h-11 rounded-xl transition-all duration-300 ${inputLang === 'en-US' ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {inputLang === 'en-US' ? 'EN' : 'KO'}
                  </button>
                  <button onClick={handleVoiceInput} className={`relative p-3 rounded-xl transition-all duration-300 ${isListening ? 'voice-active bg-red-500 text-white listening-active' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                    {isListening ? <StopIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
                  </button>
                  <div className="flex-1 relative px-2">
                    {isListening ? (
                      <span className="text-red-500 text-sm font-bold italic truncate block animate-pulse">
                        🎤 {interimTranscript || "Listening..."}
                      </span>
                    ) : (
                      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend(input)} placeholder="영어로 말해보세요..." className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium py-2 text-slate-700" />
                    )}
                  </div>
                  <button onClick={() => handleSend(input)} disabled={!input.trim() || loading} className="p-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl disabled:opacity-40 disabled:from-slate-300 disabled:to-slate-300 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/30 hover:scale-105 active:scale-95">
                    <PaperAirplaneIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
