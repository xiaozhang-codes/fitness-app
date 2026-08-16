import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================
// 配置区：环境变量由 Vercel 注入
// ============================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BILIBILI_FUNCTION_URL = import.meta.env.VITE_BILIBILI_FUNCTION_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// 模拟动作库（后续可替换为数据库）
// ============================================
const muscleGroups = ['胸', '腹', '手臂', '背', '腿', '肩', '全身'];
const exerciseBank = {
  '胸': [
    { name: '俯卧撑', sets: 3, reps: '12次', duration: 8 },
    { name: '哑铃卧推', sets: 3, reps: '10次', duration: 10 },
    { name: '上斜哑铃飞鸟', sets: 3, reps: '12次', duration: 8 },
  ],
  '腹': [
    { name: '卷腹', sets: 3, reps: '15次', duration: 6 },
    { name: '平板支撑', sets: 3, reps: '30秒', duration: 5 },
    { name: '俄罗斯转体', sets: 3, reps: '20次', duration: 7 },
  ],
  '手臂': [
    { name: '哑铃弯举', sets: 3, reps: '12次', duration: 8 },
    { name: '锤式弯举', sets: 3, reps: '12次', duration: 8 },
    { name: '绳索下压', sets: 3, reps: '12次', duration: 8 },
  ],
  '背': [
    { name: '引体向上', sets: 3, reps: '8次', duration: 10 },
    { name: '哑铃划船', sets: 3, reps: '12次', duration: 8 },
    { name: '高位下拉', sets: 3, reps: '12次', duration: 8 },
  ],
  '腿': [
    { name: '深蹲', sets: 3, reps: '15次', duration: 10 },
    { name: '弓步蹲', sets: 3, reps: '12次/腿', duration: 8 },
    { name: '腿弯举', sets: 3, reps: '12次', duration: 8 },
  ],
  '肩': [
    { name: '哑铃推举', sets: 3, reps: '12次', duration: 8 },
    { name: '侧平举', sets: 3, reps: '15次', duration: 6 },
    { name: '前平举', sets: 3, reps: '12次', duration: 6 },
  ],
  '全身': [
    { name: '波比跳', sets: 3, reps: '15次', duration: 8 },
    { name: '深蹲跳', sets: 3, reps: '15次', duration: 6 },
    { name: '开合跳', sets: 3, reps: '30秒', duration: 5 },
  ],
};

// ============================================
// 工具函数
// ============================================
function formatDuration(min) {
  if (min < 60) return min + ' 分钟';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

function getDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================
// 主 App 组件
// ============================================
export default function App() {
  const [activeTab, setActiveTab] = useState('train');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [todayPlan, setTodayPlan] = useState([]);
  const [completedExercises, setCompletedExercises] = useState(new Set());
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStartTime, setTrainingStartTime] = useState(null);
  const [timerDisplay, setTimerDisplay] = useState('00:00');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const timerRef = useRef(null);

  // 登录
  useEffect(() => {
    async function initAuth() {
      let { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        const { data } = await supabase.auth.signUp({
          email: `user_${Date.now()}@example.com`,
          password: 'anonymous123456',
        });
        if (data?.user) currentUser = data.user;
      }
      setUser(currentUser);
      if (currentUser) fetchSessions(currentUser.id);
    }
    initAuth();
  }, []);

  async function fetchSessions(userId) {
    setLoading(true);
    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });
    if (!error && data) setSessions(data);
    setLoading(false);
  }

  // 计时器
  useEffect(() => {
    if (isTraining && trainingStartTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - trainingStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        setTimerDisplay(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTraining, trainingStartTime]);

  function toggleMuscle(muscle) {
    setSelectedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  }

  function generatePlan() {
    if (selectedMuscles.length === 0) {
      alert('请至少选择一个部位');
      return;
    }
    const plan = [];
    selectedMuscles.forEach(muscle => {
      plan.push(...(exerciseBank[muscle] || []));
    });
    setTodayPlan(plan);
    setCompletedExercises(new Set());
  }

  function toggleComplete(index) {
    setCompletedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  }

  async function startTraining() {
    if (!user) {
      alert('请先登录');
      return;
    }
    setIsTraining(true);
    setTrainingStartTime(Date.now());
    setTimerDisplay('00:00');
  }

  async function endTraining() {
    if (!isTraining || !trainingStartTime) return;
    setIsTraining(false);
    const endTime = Date.now();
    const durationMinutes = (endTime - trainingStartTime) / 60000;
    const muscleGroup = selectedMuscles.join('+') || '自由训练';

    const { data, error } = await supabase
      .from('training_sessions')
      .insert([
        {
          user_id: user.id,
          started_at: new Date(trainingStartTime).toISOString(),
          ended_at: new Date(endTime).toISOString(),
          duration_minutes: Math.round(durationMinutes * 10) / 10,
          muscle_group: muscleGroup,
          notes: '',
        },
      ])
      .select();

    if (error) {
      alert('保存失败：' + error.message);
      return;
    }

    if (data && data[0]) {
      setSessions(prev => [data[0], ...prev]);
    }
    setTrainingStartTime(null);
    setTimerDisplay('00:00');
    alert(`训练完成！本次时长：${formatDuration(durationMinutes)}`);
  }

  function getNextSuggestion() {
    const trained = new Set(selectedMuscles);
    const all = muscleGroups.filter(m => m !== '全身');
    const notTrained = all.filter(m => !trained.has(m));
    if (notTrained.length === 0) return '今天练了全部主要部位，建议休息或进行有氧运动。';
    return `建议下次训练：${notTrained.join('、')}。均衡发展，避免局部过度训练。`;
  }

  function getCalendarHTML() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const trainedDates = sessions.map(s => getDateKey(s.started_at));
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`}></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isTrained = trainedDates.includes(dateStr);
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      cells.push(
        <div
          key={d}
          className={`h-9 flex items-center justify-center rounded-full text-sm cursor-pointer ${isTrained ? 'bg-green-500 text-white' : ''} ${isToday ? 'border-2 border-blue-500' : ''}`}
        >
          {d}
        </div>
      );
    }
    return cells;
  }

  function renderTodayPlanCard() {
    return (
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold mb-3">今日训练计划</h3>
        {todayPlan.map((ex, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <div>
              <p className="font-medium text-sm">{ex.name}</p>
              <p className="text-xs text-gray-500 mt-1">{ex.sets} 组 × {ex.reps} · 预计 {ex.duration} 分钟</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedVideo({ title: ex.name, bvid: 'BV1xx411c7mD' })}
                className="text-blue-500 text-lg"
                title="查看视频"
              >
                ▶️
              </button>
              <button
                onClick={() => toggleComplete(index)}
                className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${completedExercises.has(index) ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}
              >
                {completedExercises.has(index) ? '✓' : ''}
              </button>
            </div>
          </div>
        ))}
        <p className="text-xs text-gray-500 mt-3">已完成 {completedExercises.size}/{todayPlan.length} 个动作</p>
      </div>
    );
  }

  function renderTrainPage() {
    return (
      <div className="space-y-4">
        {/* 顶部统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-500">{sessions.length}</p>
            <p className="text-xs text-gray-500 mt-1">连续打卡天数</p>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-500">3</p>
            <p className="text-xs text-gray-500 mt-1">本周完成</p>
          </div>
        </div>

        {/* 开始训练按钮 */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm text-center">
          {!isTraining ? (
            <button onClick={startTraining} className="w-full py-3.5 rounded-xl bg-green-500 text-white font-semibold text-base hover:opacity-90 active:scale-[0.98] transition-all">
              开始训练
            </button>
          ) : (
            <div>
              <p className="text-3xl font-mono font-bold">{timerDisplay}</p>
              <button onClick={endTraining} className="w-full mt-3 py-3.5 rounded-xl bg-red-500 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
                结束训练
              </button>
            </div>
          )}
        </div>

        {/* 本月打卡日历 */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-2">本月打卡</h3>
          <p className="text-sm text-gray-500 mb-3">{calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月</p>
          <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
            <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
          </div>
          <div className="grid grid-cols-7 gap-2">{getCalendarHTML()}</div>
        </div>

        {/* 训练中显示计划 */}
        {isTraining && todayPlan.length > 0 && renderTodayPlanCard()}
        {isTraining && todayPlan.length === 0 && (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm text-center text-gray-500">
            自由训练中
          </div>
        )}
      </div>
    );
  }

  function renderPlanPage() {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-2">今天想练哪些部位？</h3>
          <p className="text-sm text-gray-500">选择后点击生成，为你定制今日训练计划</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {muscleGroups.map(m => (
              <button
                key={m}
                onClick={() => toggleMuscle(m)}
                className={`px-4 py-2 rounded-full text-sm transition-all ${selectedMuscles.includes(m) ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <button onClick={generatePlan} className="w-full mt-4 py-3 rounded-xl bg-blue-500 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
            生成今日计划
          </button>
        </div>

        {todayPlan.length === 0 ? (
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-8 shadow-sm text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold">还没有生成今日计划</p>
            <p className="text-sm text-gray-500 mt-2">请在上方选择部位并点击生成</p>
          </div>
        ) : (
          renderTodayPlanCard()
        )}
      </div>
    );
  }

  function muscleDurationFromSessions() {
    const durations = { '胸': 0, '腹': 0, '手臂': 0, '背': 0, '腿': 0, '肩': 0, '全身': 0 };
    sessions.forEach(s => {
      const groups = (s.muscle_group || '').split('+');
      const perMuscle = (s.duration_minutes || 0) / (groups.length || 1);
      groups.forEach(g => {
        if (durations[g] !== undefined) durations[g] = Math.round(durations[g] + perMuscle);
      });
    });
    return durations;
  }

  function renderStatsPage() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - ((today.getDay() + 6) % 7));
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const yearStart = new Date(today.getFullYear(), 0, 1);

    let totalToday = 0, totalWeek = 0, totalMonth = 0, totalYear = 0;
    const trainedDays = new Set();
    sessions.forEach(s => {
      const minutes = s.duration_minutes || 0;
      const date = new Date(s.started_at);
      if (date >= todayStart) totalToday += minutes;
      if (date >= weekStart) totalWeek += minutes;
      if (date >= monthStart) totalMonth += minutes;
      if (date >= yearStart) totalYear += minutes;
      trainedDays.add(getDateKey(date));
    });

    let streak = 0;
    const checkDate = new Date(todayStart);
    while (trainedDays.has(getDateKey(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const achievements = [
      { icon: '🎯', label: '首次训练', achieved: sessions.length >= 1 },
      { icon: '🔥', label: '连续3天', achieved: streak >= 3 },
      { icon: '💪', label: '连续7天', achieved: streak >= 7 },
      { icon: '🏆', label: '累计10次', achieved: sessions.length >= 10 },
      { icon: '⏰', label: '总时长10小时', achieved: totalYear >= 600 },
      { icon: '📅', label: '坚持30天', achieved: streak >= 30 },
    ];

    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm text-center cursor-pointer" onClick={() => setShowCalendar(true)}>
          <p className="text-4xl font-bold text-blue-500">{streak}</p>
          <p className="text-sm text-gray-500 mt-2">连续打卡天数</p>
          <p className="text-xs text-blue-500 mt-1">点击查看日历 →</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm">
            <p className="text-2xl">📅</p>
            <p className="text-lg font-bold mt-2">{formatDuration(totalToday)}</p>
            <p className="text-xs text-gray-500 mt-1">今日</p>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm">
            <p className="text-2xl">📊</p>
            <p className="text-lg font-bold mt-2">{formatDuration(totalWeek)}</p>
            <p className="text-xs text-gray-500 mt-1">本周</p>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm">
            <p className="text-2xl">📈</p>
            <p className="text-lg font-bold mt-2">{formatDuration(totalMonth)}</p>
            <p className="text-xs text-gray-500 mt-1">本月</p>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 shadow-sm">
            <p className="text-2xl">🎉</p>
            <p className="text-lg font-bold mt-2">{formatDuration(totalYear)}</p>
            <p className="text-xs text-gray-500 mt-1">今年</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3">各部位训练时长</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(muscleDurationFromSessions()).map(([muscle, duration]) => (
              <div key={muscle} className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2">
                <span className="text-xs text-gray-500">{muscle}</span>
                <span className="font-semibold ml-1">{duration} 分钟</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5">
          <h3 className="font-semibold mb-2">💡 下次训练建议</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{getNextSuggestion()}</p>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3">成就</h3>
          <div className="grid grid-cols-3 gap-3">
            {achievements.map(a => (
              <div key={a.label} className={`rounded-xl p-3 text-center ${a.achieved ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-gray-50 dark:bg-gray-800 opacity-50'}`}>
                <p className="text-2xl mb-1">{a.icon}</p>
                <p className="text-xs font-medium">{a.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3">最近训练</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500">还没有训练记录</p>
          ) : (
            sessions.slice(0, 10).map(s => (
              <div key={s.id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.muscle_group || '自由训练'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(s.started_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} ·{' '}
                    {new Date(s.started_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatDuration(s.duration_minutes)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderDietPage() {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-lg mb-3">饮食建议</h3>
          <p className="text-sm leading-relaxed">均衡饮食，保证蛋白质摄入，控制精制碳水，多喝水，少食多餐。训练前后注意补充能量和蛋白质。</p>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-lg mb-3">每日热量目标</h3>
          <p className="text-sm leading-relaxed">根据你的基础数据，估算每日总消耗约 <strong>2500 千卡</strong>。</p>
          <p className="text-sm mt-2">减脂期建议摄入：<strong>2000-2200 千卡</strong><br />增肌期建议摄入：<strong>2700-2800 千卡</strong></p>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-lg mb-3">高蛋白食物清单</h3>
          {[
            ['鸡胸肉', '约31g蛋白质/100g'],
            ['鸡蛋', '约13g蛋白质/100g'],
            ['牛肉（瘦）', '约26g蛋白质/100g'],
            ['鱼虾', '约20g蛋白质/100g'],
            ['乳清蛋白粉', '约80g蛋白质/100g'],
            ['豆制品（豆腐）', '约8-15g蛋白质/100g'],
          ].map(([name, protein]) => (
            <div key={name} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <span className="text-sm">{name}</span>
              <span className="text-sm text-gray-500">{protein}</span>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-lg mb-3">训练前建议</h3>
          <p className="text-sm leading-relaxed">训练前1-2小时摄入易消化碳水+少量蛋白质，热量约200-300千卡。</p>
          <p className="text-sm mt-2">示例：1根香蕉 + 15g坚果；或 2片全麦面包 + 1勺花生酱。</p>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-lg mb-3">训练后建议</h3>
          <p className="text-sm leading-relaxed">训练后30分钟内补充蛋白质+快速碳水，比例约1:2~1:3，热量约300-400千卡。</p>
          <p className="text-sm mt-2">示例：1勺乳清蛋白 + 1根香蕉 + 250ml牛奶；或 150g鸡胸肉 + 1小碗米饭。</p>
        </div>
      </div>
    );
  }

  function renderProfilePage() {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-lg mb-3">身体数据</h3>
          <p className="text-sm text-gray-500 mb-4">记录每天的身体变化，见证进步</p>
          <div className="mb-3">
            <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-xl cursor-pointer">
              <span className="font-medium text-sm">📏 基础数据</span>
              <span>▶</span>
            </div>
            <div className="p-3">
              {[
                ['身高', '175 cm'],
                ['体重', '72.0 kg'],
                ['年龄', '28'],
                ['性别', '男'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm">{label}</span>
                  <span className="text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-800 rounded-xl cursor-pointer">
              <span className="font-medium text-sm">📐 围度数据</span>
              <span>▶</span>
            </div>
            <div className="p-3">
              {[
                ['胸围', '98.5 cm'],
                ['腰围', '80.0 cm'],
                ['臂围', '35.3 cm'],
                ['大腿围', '54.8 cm'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm">{label}</span>
                  <span className="text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all">
            保存今日数据
          </button>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3">历史变化曲线</h3>
          <p className="text-sm text-gray-500 text-center py-8">图表功能将在后续版本中加入</p>
        </div>

        <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold mb-3">照片记录</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl text-gray-400">+</div>
            <div className="col-span-2 flex items-center text-sm text-gray-500">每天记录一张照片，见证变化</div>
          </div>
          <button className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 font-medium text-sm hover:opacity-90 active:scale-[0.98] transition-all">
            添加照片
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 dark:bg-black/70 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto px-5 py-4 text-center">
          <h1 className="text-2xl font-bold">健身打卡</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-2xl mx-auto px-5 pt-5">
        {activeTab === 'train' && renderTrainPage()}
        {activeTab === 'plan' && renderPlanPage()}
        {activeTab === 'stats' && renderStatsPage()}
        {activeTab === 'diet' && renderDietPage()}
        {activeTab === 'profile' && renderProfilePage()}
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-t border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-2xl mx-auto flex justify-around items-center px-5 py-2">
          <TabButton icon="🏋️" label="训练" active={activeTab === 'train'} onClick={() => setActiveTab('train')} />
          <TabButton icon="📋" label="计划" active={activeTab === 'plan'} onClick={() => setActiveTab('plan')} />
          <TabButton icon="📊" label="统计" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
          <TabButton icon="🥗" label="饮食" active={activeTab === 'diet'} onClick={() => setActiveTab('diet')} />
          <TabButton icon="👤" label="我的" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </div>
        <div className="pb-2" />
      </nav>

      {/* 视频弹窗 */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <p className="font-semibold truncate pr-4">{selectedVideo.title}</p>
              <button onClick={() => setSelectedVideo(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">✕</button>
            </div>
            <div className="aspect-video">
              <iframe
                src={`https://player.bilibili.com/player.html?bvid=${selectedVideo.bvid}&autoplay=1`}
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; encrypted-media; fullscreen"
              />
            </div>
          </div>
        </div>
      )}

      {/* 日历弹窗 */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowCalendar(false)}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <span className="font-semibold">打卡日历</span>
              <button onClick={() => setShowCalendar(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">✕</button>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="text-blue-500 text-lg">‹</button>
                <span className="font-semibold">{calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月</span>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="text-blue-500 text-lg">›</button>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-500 mb-2">
                <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
              </div>
              <div className="grid grid-cols-7 gap-2">{getCalendarHTML()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 底部导航按钮组件
// ============================================
function TabButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center px-4 py-1 rounded-xl transition-all ${active ? 'text-blue-500 scale-105' : 'text-gray-500'}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs font-medium mt-0.5">{label}</span>
    </button>
  );
}
