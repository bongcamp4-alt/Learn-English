# 🎓 AI Teacher Pro - 영어 회화 학습 앱

<div align="center">

**AI 선생님과 함께하는 실전 영어 회화 연습!**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285F4?logo=google)](https://ai.google.dev)

</div>

---

## ✨ 주요 기능

### 🗣️ AI 영어 선생님
- **9가지 상황별 토픽** - 일반 대화, 관광, 음식점, 교통, 쇼핑, 호텔, 여행, 비즈니스, 긴급상황
- **3단계 난이도** - Beginner / Intermediate / Advanced
- **실시간 문법 교정** - 틀린 부분을 친절하게 수정해줌
- **한국어 번역 제공** - 모든 AI 응답에 한국어 번역 포함

### 🔊 음성 기능
- **TTS 음성 재생** - AI 응답을 원어민 발음으로 들을 수 있음
- **🐢 SLOW 모드** - 75% 속도로 천천히 듣기
- **5가지 음성 선택** - Kore, Puck, Charon, Fenrir, Zephyr
- **음성 인식 입력** - 마이크로 영어/한국어 음성 입력 지원

### 💬 대화 관리
- **↩️ 다시 대답** - 특정 지점부터 대화 다시 시작
- **대화 기록 저장** - 로컬 스토리지에 자동 저장
- **토픽 변경** - 언제든 새로운 상황으로 전환

### 🎨 프리미엄 UI/UX
- **애니메이션 그라디언트 배경** - 보라-핑크-시안 동적 배경
- **글래스모피즘 디자인** - 모던하고 세련된 인터페이스
- **반응형 디자인** - 모바일/태블릿/데스크톱 지원
- **PWA 지원** - 홈 화면에 추가하여 앱처럼 사용

---

## 🚀 시작하기

### 필수 요구사항
- Node.js 18+
- Gemini API 키 ([Google AI Studio](https://aistudio.google.com/app/apikey)에서 무료 발급)

### 로컬 실행

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 접속
# http://localhost:3000
```

### 첫 실행 시
1. 앱 접속 시 API 키 입력창이 표시됩니다
2. Gemini API 키를 입력하면 바로 사용 가능
3. API 키는 로컬에만 저장되며 외부로 전송되지 않습니다

---

## 📱 배포하기

### Vercel 배포 (권장)

1. GitHub에 저장소 업로드
2. [vercel.com](https://vercel.com) 접속 → GitHub 로그인
3. "New Project" → 저장소 선택 → Deploy

### 휴대폰에서 사용하기

배포된 URL 접속 후:
- **iOS**: Safari → 공유 → "홈 화면에 추가"
- **Android**: Chrome → 메뉴 → "홈 화면에 추가"

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | React 19, TypeScript |
| Styling | TailwindCSS, Custom CSS |
| AI | Google Gemini API |
| TTS | Gemini TTS (gemini-2.5-flash-preview-tts) |
| 빌드 | Vite |
| 배포 | Vercel |

---

## 📁 프로젝트 구조

```
Learn-English/
├── App.tsx           # 메인 앱 컴포넌트
├── index.html        # HTML 엔트리
├── index.css         # 프리미엄 CSS 디자인 시스템
├── index.tsx         # React 엔트리
├── types.ts          # TypeScript 타입 정의
├── services/
│   └── gemini.ts     # Gemini AI API 서비스
├── utils/
│   └── audio.ts      # 오디오 처리 유틸리티
└── package.json
```

---

## 📝 사용법

### 1️⃣ 토픽 선택
앱 시작 시 9가지 상황 중 원하는 토픽을 선택합니다.

### 2️⃣ 영어로 대화
- 텍스트 입력 또는 마이크 버튼으로 음성 입력
- EN/KO 버튼으로 입력 언어 전환

### 3️⃣ AI 응답 듣기
- **LISTEN** - 일반 속도 재생
- **🐢 SLOW** - 천천히 듣기 (75% 속도)

### 4️⃣ 다시 시도
- **↩️ 다시 대답** - 해당 지점부터 다시 시작

---

## ⚙️ 설정

사이드바(☰)에서 변경 가능:
- **Level** - 난이도 조절
- **Teacher Voice** - AI 음성 선택
- **Reset Chat** - 대화 초기화
- **API 키 변경** - 다른 API 키로 전환

---

## 📄 라이선스

MIT License

---

<div align="center">

**Made with ❤️ for English Learners**

</div>
