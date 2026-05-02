import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

// ── All available muscle groups user can pick from ──
const ALL_MUSCLES = [
  { id: "chest", label: "Chest", icon: "🫁" },
  { id: "back", label: "Back", icon: "🔙" },
  { id: "upper legs", label: "Legs", icon: "🦵" },
  { id: "upper arms", label: "Arms", icon: "💪" },
  { id: "shoulders", label: "Shoulders", icon: "🏋️" },
  { id: "waist", label: "Core", icon: "⚡" },
  { id: "cardio", label: "Cardio", icon: "🏃" },
  { id: "lower legs", label: "Calves", icon: "🦶" },
  { id: "lower arms", label: "Forearms", icon: "🤜" },
  { id: "neck", label: "Neck", icon: "🔝" },
];

// ── Mock user datsa ──
const USER = {
  name: "Basit",
  gender: "male" as "male" | "female",
  goal: "build_muscle",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
const DEFAULT_DAY_PLANS: Record<number, string[]> = {
  0: ["chest"],
  1: ["back"],
  2: ["upper legs"],
  3: ["rest"],
  4: ["shoulders"],
  5: ["upper arms"],
  6: ["rest"],
};

/** Fallback exercise art when using mock data; v2.exercisedb.io often returns 5xx. */
const MOCK_EXERCISE_IMAGE_URI =
  "https://placehold.co/360x360/1a1a1a/3dbf3d/png?text=Exercise";

interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  /** Native only: RapidAPI auth for exercisedb image requests (web uses query param on gifUrl). */
  gifAuthHeaders?: Record<string, string>;
  instructions: string[];
  secondaryMuscles: string[];
}

// ── GIF Image with loading skeleton ──
function GifImage({
  uri,
  headers,
  style,
}: {
  uri: string;
  headers?: Record<string, string>;
  style: any;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const shimmer = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Pulse animation for the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View
      style={[
        style,
        {
          backgroundColor: "#0f0f0f",
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
        },
      ]}
    >
      {/* Shimmer background always shown until loaded */}
      {!loaded && !errored && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "#1a1a1a",
              opacity: shimmer.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.8],
              }),
            },
          ]}
        />
      )}

      {/* Fallback icon when no API key or error */}
      {(errored || !loaded) && (
        <Animated.Text style={{ fontSize: 28, transform: [{ scale: pulse }] }}>
          💪
        </Animated.Text>
      )}

      {/* Actual GIF */}
      <Image
        source={
          headers && Object.keys(headers).length > 0
            ? { uri, headers }
            : { uri }
        }
        style={[
          style,
          {
            position: "absolute",
            opacity: loaded ? 1 : 0,
          },
        ]}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
      />
    </View>
  );
}

export default function WorkoutScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(todayIdx);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState("all");
  const [showMusclePicker, setShowMusclePicker] = useState(false);
  // dayPlans stores selected muscle groups (or ['rest']) by day index
  const [dayPlans, setDayPlans] = useState<Record<number, string[]>>(DEFAULT_DAY_PLANS);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const muscleModalAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const muscles = dayPlans[selectedDay] || [];
    if (muscles.length === 0 || muscles.includes("rest")) {
      setExercises([]);
      return;
    }
    fetchExercises(muscles);
  }, [selectedDay, dayPlans]);

  const fetchExercises = async (muscles: string[]) => {
  // 1. Get the Key and check it immediately to satisfy TypeScript
  const API_KEY = process.env.EXPO_PUBLIC_RAPID_API_KEY;

  if (!API_KEY) {
    console.error("❌ API Key is missing! Check your .env file and restart Expo.");
    const fallback = muscles.flatMap((muscle) => getMockExercises(muscle));
    setExercises(uniqueExercisesById(fallback));
    return;
  }

  // 2. Set UI states
  setLoading(true);
  setActiveFilter("all");

  try {
    const responses = await Promise.all(
      muscles.map(async (muscle) => {
        const listUrl = `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(muscle)}?limit=10`;
        const response = await fetch(listUrl, {
          headers: {
            "X-RapidAPI-Key": API_KEY,
            "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
          },
        });

        if (!response.ok) {
          const errorMsg = await response.text();
          throw new Error(`API error for ${muscle}: ${response.status} - ${errorMsg}`);
        }

        const data = await response.json();
        return data.map((ex: any) => {
          const idEnc = encodeURIComponent(String(ex.id));
          const baseQs = `https://exercisedb.p.rapidapi.com/image?exerciseId=${idEnc}&resolution=180`;
          const useHeaderAuth = Platform.OS !== "web";
          return {
            id: ex.id,
            name: ex.name,
            bodyPart: ex.bodyPart,
            target: ex.target,
            equipment: ex.equipment,
            gifUrl: useHeaderAuth
              ? baseQs
              : `${baseQs}&rapidapi-key=${encodeURIComponent(API_KEY)}`,
            gifAuthHeaders: useHeaderAuth
              ? {
                  "X-RapidAPI-Key": API_KEY,
                  "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
                }
              : undefined,
            instructions: ex.instructions || [],
            secondaryMuscles: ex.secondaryMuscles || [],
          };
        });
      })
    );

    const mapped = uniqueExercisesById(responses.flat());

    console.log("✅ Exercises loaded successfully");
    setExercises(mapped);
    
  } catch (e) {
    console.log("❌ Fetch error details:", e);
    // Fallback to mock data so the app doesn't stay empty
    const fallback = muscles.flatMap((muscle) => getMockExercises(muscle));
    setExercises(uniqueExercisesById(fallback));
  } finally {
    // 4. Stop loading animation regardless of success or failure
    setLoading(false);
  }
};

  const openMusclePicker = () => {
    setShowMusclePicker(true);
    muscleModalAnim.setValue(0);
    Animated.spring(muscleModalAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeMusclePicker = () => {
    Animated.timing(muscleModalAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setShowMusclePicker(false));
  };

  const toggleMuscleInDay = (muscleId: string) => {
    setDayPlans((prev) => {
      const daySelection = prev[selectedDay] || [];
      const withoutRest = daySelection.filter((id) => id !== "rest");
      const nextSelection = withoutRest.includes(muscleId)
        ? withoutRest.filter((id) => id !== muscleId)
        : [...withoutRest, muscleId];
      return {
        ...prev,
        [selectedDay]: nextSelection.length ? nextSelection : ["rest"],
      };
    });
    setCompletedIds(new Set());
  };

  const setRestDay = () => {
    setDayPlans((prev) => ({ ...prev, [selectedDay]: ["rest"] }));
    setCompletedIds(new Set());
  };

  const openExercise = (ex: Exercise) => {
    setSelectedExercise(ex);
    modalAnim.setValue(0);
    Animated.spring(modalAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedExercise(null);
    });
  };

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filters = [
    "all",
    ...Array.from(new Set(exercises.map((e) => e.bodyPart))),
  ];
  const filtered =
    activeFilter === "all"
      ? exercises
      : exercises.filter((e) => e.bodyPart === activeFilter);
  const completedCount = exercises.filter((e) => completedIds.has(e.id)).length;
  const selectedDayPlan = dayPlans[selectedDay] || ["rest"];
  const isRestDay = selectedDayPlan.includes("rest") || selectedDayPlan.length === 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <View>
          <Text style={styles.headerTitle}>Workout</Text>
          <Text style={styles.headerSub}>
            {GOAL_LABELS[USER.goal]} · {USER.gender}
          </Text>
        </View>
        <View style={styles.completionBadge}>
          <Text style={styles.completionText}>
            {completedCount}/{exercises.length}
          </Text>
          <Text style={styles.completionLabel}>done</Text>
        </View>
      </Animated.View>

      {/* Day selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayScroll}
      >
        {DAYS.map((day, i) => {
          const plan = dayPlans[i] || ["rest"];
          const isRest = plan.includes("rest") || plan.length === 0;
          const muscleInfos = ALL_MUSCLES.filter((m) => plan.includes(m.id));
          const primaryIcon = muscleInfos[0]?.icon ?? "💪";
          const label =
            muscleInfos.length > 1
              ? `${muscleInfos[0].label} +${muscleInfos.length - 1}`
              : muscleInfos[0]?.label ?? "Custom";
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.dayBtn,
                i === selectedDay && styles.dayBtnActive,
                i === todayIdx && i !== selectedDay && styles.dayBtnToday,
              ]}
              onPress={() => {
                setSelectedDay(i);
                setCompletedIds(new Set());
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.dayLabel,
                  i === selectedDay && styles.dayLabelActive,
                ]}
              >
                {day}
              </Text>
              <Text style={styles.dayMuscleIcon}>
                {isRest ? "😴" : primaryIcon}
              </Text>
              <Text
                style={[
                  styles.daySplit,
                  i === selectedDay && styles.daySplitActive,
                ]}
                numberOfLines={1}
              >
                {isRest ? "Rest" : label}
              </Text>
              {i === todayIdx && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Change today's muscle button */}
      <TouchableOpacity
        style={styles.changeBtn}
        onPress={openMusclePicker}
        activeOpacity={0.8}
      >
        <Text style={styles.changeBtnText}>
          {isRestDay
            ? "😴 Rest day · tap to change"
            : `💪 ${selectedDayPlan
                .map((id) => ALL_MUSCLES.find((m) => m.id === id)?.label)
                .filter(Boolean)
                .join(", ")} · tap to change`}
        </Text>
        <Text style={styles.changeBtnArrow}>↓</Text>
      </TouchableOpacity>

      {/* Progress bar */}
      {exercises.length > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(completedCount / exercises.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {Math.round((completedCount / exercises.length) * 100)}%
          </Text>
        </View>
      )}

      {/* Filter chips */}
      {exercises.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                activeFilter === f && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === f && styles.filterTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#3dbf3d" size="large" />
          <Text style={styles.loadingText}>Loading exercises...</Text>
          <Text style={styles.loadingNote}>⚠ Requires internet connection</Text>
        </View>
      ) : isRestDay ? (
        <View style={styles.centered}>
          <Text style={styles.restIcon}>😴</Text>
          <Text style={styles.restTitle}>Rest day</Text>
          <Text style={styles.restSub}>
            Recovery is part of the plan. Stay hydrated and sleep well.
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.restIcon}>🏋️</Text>
          <Text style={styles.restTitle}>No exercises yet</Text>
          <Text style={styles.restSub}>
            No exercises match this day/filter. Tap the day plan bar above to
            pick a muscle group.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.exerciseList}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((ex, i) => (
            <TouchableOpacity
              key={ex.id}
              style={[
                styles.exerciseCard,
                completedIds.has(ex.id) && styles.exerciseCardDone,
              ]}
              onPress={() => openExercise(ex)}
              activeOpacity={0.85}
            >
              {/* GIF thumbnail */}
              <View style={styles.gifWrap}>
                <GifImage
                  uri={ex.gifUrl}
                  headers={ex.gifAuthHeaders}
                  style={styles.gifThumb}
                />
                {USER.gender === "female" && (
                  <View style={styles.genderTag}>
                    <Text style={styles.genderTagText}>♀</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName} numberOfLines={2}>
                  {capitalize(ex.name)}
                </Text>
                <Text style={styles.exerciseMeta}>
                  {capitalize(ex.bodyPart)} · {capitalize(ex.equipment)}
                </Text>
                <View style={styles.targetChip}>
                  <Text style={styles.targetText}>{capitalize(ex.target)}</Text>
                </View>
              </View>

              {/* Complete toggle */}
              <TouchableOpacity
                style={[
                  styles.completeBtn,
                  completedIds.has(ex.id) && styles.completeBtnDone,
                ]}
                onPress={() => toggleComplete(ex.id)}
              >
                <Text style={styles.completeBtnText}>
                  {completedIds.has(ex.id) ? "✓" : "○"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {completedCount === exercises.length && exercises.length > 0 && (
            <View style={styles.allDoneBanner}>
              <Text style={styles.allDoneEmoji}>🏆</Text>
              <Text style={styles.allDoneTitle}>Workout complete!</Text>
              <Text style={styles.allDoneSub}>
                Excellent work. Rest well and come back stronger.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Exercise Detail Modal ── */}
      <Modal
        visible={!!selectedExercise}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalSheet,
              {
                transform: [
                  {
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [height, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedExercise && (
                <>
                  {/* GIF */}
                  <GifImage
                    uri={selectedExercise.gifUrl}
                    headers={selectedExercise.gifAuthHeaders}
                    style={styles.modalGif}
                  />

                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                      {capitalize(selectedExercise.name)}
                    </Text>

                    <View style={styles.modalTags}>
                      <View style={styles.modalTag}>
                        <Text style={styles.modalTagText}>
                          {capitalize(selectedExercise.bodyPart)}
                        </Text>
                      </View>
                      <View style={styles.modalTag}>
                        <Text style={styles.modalTagText}>
                          {capitalize(selectedExercise.target)}
                        </Text>
                      </View>
                      <View style={styles.modalTag}>
                        <Text style={styles.modalTagText}>
                          {capitalize(selectedExercise.equipment)}
                        </Text>
                      </View>
                    </View>

                    {selectedExercise.secondaryMuscles?.length > 0 && (
                      <>
                        <Text style={styles.modalSectionLabel}>
                          Secondary muscles
                        </Text>
                        <Text style={styles.modalBodyText}>
                          {selectedExercise.secondaryMuscles
                            .map(capitalize)
                            .join(", ")}
                        </Text>
                      </>
                    )}

                    <Text style={styles.modalSectionLabel}>Instructions</Text>
                    {selectedExercise.instructions?.map((step, i) => (
                      <View key={i} style={styles.instructionRow}>
                        <View style={styles.instructionNum}>
                          <Text style={styles.instructionNumText}>{i + 1}</Text>
                        </View>
                        <Text style={styles.instructionText}>{step}</Text>
                      </View>
                    ))}

                    <TouchableOpacity
                      style={[
                        styles.modalCompleteBtn,
                        completedIds.has(selectedExercise.id) &&
                          styles.modalCompleteBtnDone,
                      ]}
                      onPress={() => {
                        toggleComplete(selectedExercise.id);
                        closeModal();
                      }}
                    >
                      <Text style={styles.modalCompleteBtnText}>
                        {completedIds.has(selectedExercise.id)
                          ? "✓ Marked as done"
                          : "Mark as done"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
      {/* ── Muscle Picker Modal ── */}
      <Modal
        visible={showMusclePicker}
        transparent
        animationType="none"
        onRequestClose={closeMusclePicker}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeMusclePicker}
        >
          <Animated.View
            style={[
              styles.muscleSheet,
              {
                transform: [
                  {
                    translateY: muscleModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.muscleSheetHandle} />
            <Text style={styles.muscleSheetTitle}>
              What are you training {DAYS[selectedDay]}?
            </Text>
            <Text style={styles.muscleSheetSub}>
              Pick a muscle group or mark as rest
            </Text>

            <View style={styles.muscleGrid}>
              {ALL_MUSCLES.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.muscleChip,
                    selectedDayPlan.includes(m.id) && styles.muscleChipActive,
                  ]}
                  onPress={() => toggleMuscleInDay(m.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.muscleChipIcon}>{m.icon}</Text>
                  <Text
                    style={[
                      styles.muscleChipLabel,
                      selectedDayPlan.includes(m.id) &&
                        styles.muscleChipLabelActive,
                    ]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Rest option */}
              <TouchableOpacity
                style={[
                  styles.muscleChip,
                  styles.muscleChipRest,
                  isRestDay &&
                    styles.muscleChipRestActive,
                ]}
                onPress={setRestDay}
                activeOpacity={0.8}
              >
                <Text style={styles.muscleChipIcon}>😴</Text>
                <Text
                  style={[
                    styles.muscleChipLabel,
                    isRestDay && { color: "#ba7517" },
                  ]}
                >
                  Rest
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.muscleActions}>
              <TouchableOpacity style={styles.muscleDoneBtn} onPress={closeMusclePicker}>
                <Text style={styles.muscleDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Helpers ──
const capitalize = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Lose weight",
  build_muscle: "Build muscle",
  bulk: "Bulk up",
  lean: "Get lean",
  muscle_mass: "Muscle mass",
  stay_fit: "Stay fit",
};

// ── Mock exercises with real GIF URLs per muscle group ──
const MOCK_BY_MUSCLE: Record<string, Exercise[]> = {
  chest: [
    {
      id: "c1",
      name: "Barbell Bench Press",
      bodyPart: "chest",
      target: "pectorals",
      equipment: "barbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Lie flat on bench",
        "Grip bar slightly wider than shoulders",
        "Lower bar to mid-chest",
        "Press up explosively",
        "Lock out at top",
      ],
      secondaryMuscles: ["triceps", "front delts"],
    },
    {
      id: "c2",
      name: "Push-Up",
      bodyPart: "chest",
      target: "pectorals",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Start in high plank",
        "Keep core tight",
        "Lower chest to floor",
        "Push back up fully",
      ],
      secondaryMuscles: ["triceps", "core"],
    },
    {
      id: "c3",
      name: "Incline Dumbbell Press",
      bodyPart: "chest",
      target: "pectorals",
      equipment: "dumbbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Set bench to 30-45°",
        "Hold dumbbells at chest level",
        "Press up and in",
        "Lower slowly",
      ],
      secondaryMuscles: ["triceps", "shoulders"],
    },
    {
      id: "c4",
      name: "Cable Fly",
      bodyPart: "chest",
      target: "pectorals",
      equipment: "cable",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Stand between cables",
        "Set cables to chest height",
        "Bring hands together in arc",
        "Squeeze chest at peak",
      ],
      secondaryMuscles: ["biceps"],
    },
    {
      id: "c5",
      name: "Chest Dips",
      bodyPart: "chest",
      target: "pectorals",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Grip parallel bars",
        "Lean slightly forward",
        "Lower until stretch",
        "Push back up",
      ],
      secondaryMuscles: ["triceps"],
    },
  ],
  back: [
    {
      id: "b1",
      name: "Pull-Up",
      bodyPart: "back",
      target: "lats",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Hang from bar with overhand grip",
        "Pull chest toward bar",
        "Lower with control",
      ],
      secondaryMuscles: ["biceps", "rear delts"],
    },
    {
      id: "b2",
      name: "Barbell Row",
      bodyPart: "back",
      target: "lats",
      equipment: "barbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Hinge at hips",
        "Pull bar to lower chest",
        "Squeeze shoulder blades",
        "Lower with control",
      ],
      secondaryMuscles: ["biceps", "rear delts"],
    },
    {
      id: "b3",
      name: "Lat Pulldown",
      bodyPart: "back",
      target: "lats",
      equipment: "cable",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Grip bar wide",
        "Pull to upper chest",
        "Squeeze lats at bottom",
        "Return slowly",
      ],
      secondaryMuscles: ["biceps"],
    },
    {
      id: "b4",
      name: "Seated Cable Row",
      bodyPart: "back",
      target: "lats",
      equipment: "cable",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Sit upright",
        "Pull handle to abdomen",
        "Hold briefly",
        "Return fully",
      ],
      secondaryMuscles: ["biceps", "rear delts"],
    },
  ],
  "upper legs": [
    {
      id: "l1",
      name: "Barbell Squat",
      bodyPart: "upper legs",
      target: "quads",
      equipment: "barbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Bar on upper traps",
        "Feet shoulder-width",
        "Squat to parallel",
        "Drive through heels",
      ],
      secondaryMuscles: ["glutes", "hamstrings"],
    },
    {
      id: "l2",
      name: "Leg Press",
      bodyPart: "upper legs",
      target: "quads",
      equipment: "machine",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Seat back fully",
        "Feet hip-width on plate",
        "Lower to 90°",
        "Press up without locking",
      ],
      secondaryMuscles: ["glutes"],
    },
    {
      id: "l3",
      name: "Romanian Deadlift",
      bodyPart: "upper legs",
      target: "hamstrings",
      equipment: "barbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Stand hip-width",
        "Hinge at hips",
        "Lower bar along legs",
        "Return by squeezing glutes",
      ],
      secondaryMuscles: ["glutes", "lower back"],
    },
    {
      id: "l4",
      name: "Walking Lunges",
      bodyPart: "upper legs",
      target: "quads",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Step forward into lunge",
        "Back knee near floor",
        "Drive front foot to stand",
        "Alternate legs",
      ],
      secondaryMuscles: ["glutes", "calves"],
    },
  ],
  "upper arms": [
    {
      id: "a1",
      name: "Barbell Curl",
      bodyPart: "upper arms",
      target: "biceps",
      equipment: "barbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Stand with bar at hips",
        "Curl up to shoulder height",
        "Squeeze at top",
        "Lower slowly",
      ],
      secondaryMuscles: ["forearms"],
    },
    {
      id: "a2",
      name: "Tricep Pushdown",
      bodyPart: "upper arms",
      target: "triceps",
      equipment: "cable",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Grip rope or bar",
        "Keep elbows pinned",
        "Push down fully",
        "Return slowly",
      ],
      secondaryMuscles: [],
    },
    {
      id: "a3",
      name: "Hammer Curl",
      bodyPart: "upper arms",
      target: "biceps",
      equipment: "dumbbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Neutral grip",
        "Curl up keeping wrists straight",
        "Squeeze at top",
      ],
      secondaryMuscles: ["forearms"],
    },
    {
      id: "a4",
      name: "Skull Crushers",
      bodyPart: "upper arms",
      target: "triceps",
      equipment: "barbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Lie on bench",
        "Lower bar to forehead",
        "Extend arms fully",
        "Control the descent",
      ],
      secondaryMuscles: [],
    },
  ],
  shoulders: [
    {
      id: "s1",
      name: "Overhead Press",
      bodyPart: "shoulders",
      target: "delts",
      equipment: "barbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Stand with bar at chest",
        "Press overhead",
        "Lock out at top",
        "Lower to clavicle",
      ],
      secondaryMuscles: ["triceps", "core"],
    },
    {
      id: "s2",
      name: "Lateral Raise",
      bodyPart: "shoulders",
      target: "delts",
      equipment: "dumbbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Hold dumbbells at sides",
        "Raise arms to shoulder height",
        "Slight bend in elbows",
        "Lower slowly",
      ],
      secondaryMuscles: [],
    },
    {
      id: "s3",
      name: "Face Pull",
      bodyPart: "shoulders",
      target: "delts",
      equipment: "cable",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Set cable high",
        "Pull rope to face",
        "External rotate at end",
        "Return slowly",
      ],
      secondaryMuscles: ["rear delts", "traps"],
    },
  ],
  waist: [
    {
      id: "w1",
      name: "Plank",
      bodyPart: "waist",
      target: "abs",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Forearms on floor",
        "Body straight from head to toe",
        "Squeeze abs and glutes",
        "Hold for time",
      ],
      secondaryMuscles: ["shoulders", "glutes"],
    },
    {
      id: "w2",
      name: "Crunch",
      bodyPart: "waist",
      target: "abs",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Lie on back",
        "Feet flat on floor",
        "Curl shoulders to knees",
        "Lower with control",
      ],
      secondaryMuscles: [],
    },
    {
      id: "w3",
      name: "Russian Twist",
      bodyPart: "waist",
      target: "abs",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Sit with feet raised",
        "Lean back slightly",
        "Rotate side to side",
        "Keep core tight",
      ],
      secondaryMuscles: ["obliques"],
    },
    {
      id: "w4",
      name: "Leg Raise",
      bodyPart: "waist",
      target: "abs",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Lie flat",
        "Keep legs straight",
        "Raise to 90°",
        "Lower slowly without touching floor",
      ],
      secondaryMuscles: ["hip flexors"],
    },
  ],
  cardio: [
    {
      id: "cv1",
      name: "Jumping Jacks",
      bodyPart: "cardio",
      target: "cardiovascular system",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Stand upright",
        "Jump feet wide while raising arms",
        "Return to start",
        "Repeat continuously",
      ],
      secondaryMuscles: [],
    },
    {
      id: "cv2",
      name: "Jump Rope",
      bodyPart: "cardio",
      target: "cardiovascular system",
      equipment: "rope",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Hold handles at hip level",
        "Swing rope overhead",
        "Jump on balls of feet",
        "Keep rhythm steady",
      ],
      secondaryMuscles: ["calves"],
    },
    {
      id: "cv3",
      name: "Burpee",
      bodyPart: "cardio",
      target: "cardiovascular system",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Stand, squat and place hands",
        "Jump feet back to plank",
        "Do a push-up",
        "Jump feet in and leap up",
      ],
      secondaryMuscles: ["chest", "legs"],
    },
    {
      id: "cv4",
      name: "Mountain Climbers",
      bodyPart: "cardio",
      target: "cardiovascular system",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "High plank position",
        "Drive knees alternately to chest",
        "Keep hips level",
        "Move fast",
      ],
      secondaryMuscles: ["core", "shoulders"],
    },
  ],
  "lower legs": [
    {
      id: "ll1",
      name: "Standing Calf Raise",
      bodyPart: "lower legs",
      target: "calves",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Stand on edge of step",
        "Rise onto toes fully",
        "Lower below step level",
        "Slow and controlled",
      ],
      secondaryMuscles: [],
    },
    {
      id: "ll2",
      name: "Seated Calf Raise",
      bodyPart: "lower legs",
      target: "calves",
      equipment: "machine",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Sit with pads on knees",
        "Push up onto toes",
        "Hold briefly",
        "Lower slowly",
      ],
      secondaryMuscles: [],
    },
  ],
  "lower arms": [
    {
      id: "fa1",
      name: "Wrist Curl",
      bodyPart: "lower arms",
      target: "forearms",
      equipment: "barbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Forearms on thighs",
        "Curl wrists up",
        "Lower fully",
        "Keep arms still",
      ],
      secondaryMuscles: [],
    },
    {
      id: "fa2",
      name: "Reverse Curl",
      bodyPart: "lower arms",
      target: "forearms",
      equipment: "barbell",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Overhand grip",
        "Curl bar to shoulders",
        "Lower fully",
        "Keep elbows pinned",
      ],
      secondaryMuscles: ["biceps"],
    },
  ],
  neck: [
    {
      id: "n1",
      name: "Neck Flexion",
      bodyPart: "neck",
      target: "sternocleidomastoid",
      equipment: "body weight",
      gifUrl: MOCK_EXERCISE_IMAGE_URI,
      instructions: [
        "Sit upright",
        "Slowly lower chin to chest",
        "Return to neutral",
        "Slow and gentle",
      ],
      secondaryMuscles: [],
    },
  ],
};

const getMockExercises = (muscle?: string): Exercise[] => {
  const key = muscle || "chest";
  return MOCK_BY_MUSCLE[key] || MOCK_BY_MUSCLE["chest"];
};

const uniqueExercisesById = (items: Exercise[]): Exercise[] => {
  const map = new Map<string, Exercise>();
  items.forEach((item) => {
    if (!map.has(item.id)) map.set(item.id, item);
  });
  return Array.from(map.values());
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 48,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f0f0f0",
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 12, color: "#555", marginTop: 2 },
  completionBadge: {
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 10,
    borderWidth: 0.5,
    borderColor: "#222",
  },
  completionText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3dbf3d",
    letterSpacing: -0.5,
  },
  completionLabel: { fontSize: 10, color: "#444" },

  dayScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 8 },
  dayBtn: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 0.5,
    borderColor: "#1e1e1e",
    minWidth: 62,
    position: "relative",
  },
  dayBtnActive: { backgroundColor: "#0d1f0d", borderColor: "#3dbf3d" },
  dayBtnToday: { borderColor: "#2a3a2a" },
  dayLabel: { fontSize: 11, color: "#555", fontWeight: "600", marginBottom: 2 },
  dayLabelActive: { color: "#3dbf3d" },
  dayMuscleIcon: { fontSize: 16, marginBottom: 2 },
  daySplit: { fontSize: 9, color: "#333", textAlign: "center", maxWidth: 70 },
  daySplitActive: { color: "#3dbf3d" },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3dbf3d",
    position: "absolute",
    top: 6,
    right: 6,
  },

  changeBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginHorizontal: 20,
  marginTop: 2,
  marginBottom: 12,
  backgroundColor: "#111",
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 11,
  borderWidth: 0.5,
  borderColor: "#2a2a2a",
},
  changeBtnText: { fontSize: 13, color: "#666", fontWeight: "500", flex: 1, paddingRight: 10 },
  changeBtnArrow: { fontSize: 14, color: "#3dbf3d" },

  muscleSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 52,
    paddingBottom: 40,
    borderWidth: 0.5,
    borderColor: "#222",
  },
  muscleSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  muscleSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f0f0f0",
    marginBottom: 4,
  },
  muscleSheetSub: { fontSize: 13, color: "#555", marginBottom: 20 },
  muscleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  muscleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0.5,
    borderColor: "#222",
  },
  muscleChipActive: { backgroundColor: "#0d1f0d", borderColor: "#3dbf3d" },
  muscleChipRest: { borderColor: "#2e2010" },
  muscleChipRestActive: { backgroundColor: "#1f1500", borderColor: "#ba7517" },
  muscleChipIcon: { fontSize: 16 },
  muscleChipLabel: { fontSize: 13, color: "#888", fontWeight: "500" },
  muscleChipLabelActive: { color: "#3dbf3d" },
  muscleActions: { marginTop: 18, alignItems: "flex-end" },
  muscleDoneBtn: {
    backgroundColor: "#3dbf3d",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  muscleDoneBtnText: { color: "#0a0a0a", fontSize: 13, fontWeight: "700" },

  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "#1a1a1a",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#3dbf3d", borderRadius: 2 },
  progressLabel: { fontSize: 11, color: "#555", width: 30, textAlign: "right" },

  filterScroll: { paddingHorizontal: 20, paddingVertical: 4, marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#111",
    borderWidth: 1.5,
    borderColor: "#1e1e1e",
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
    marginRight: 10,
  },
  filterChipActive: { backgroundColor: "#0d1f0d", borderColor: "#3dbf3d", },
  filterText: { fontSize: 12, color: "#555", fontWeight: "500" },
  filterTextActive: { color: "#3dbf3d" },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: { color: "#555", marginTop: 14, fontSize: 14 },
  loadingNote: { color: "#333", marginTop: 8, fontSize: 12 },
  restIcon: { fontSize: 48, marginBottom: 16 },
  restTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f0f0f0",
    marginBottom: 8,
  },
  restSub: { fontSize: 14, color: "#555", textAlign: "center", lineHeight: 22 },

  exerciseList: { paddingHorizontal: 20,paddingTop:10, paddingBottom: 120, gap: 12 },
  exerciseCard: {
    backgroundColor: "#111",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#1e1e1e",
    overflow: "hidden",
    marginBottom: 12,
    minHeight: 90,
  },
  exerciseCardDone: { opacity: 0.5 },
  gifWrap: {
    width: 90,
    height: 90,
    backgroundColor: "#0a0a0a",
    position: "relative",
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifThumb: { width: 90, height: 90 },
  genderTag: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: "#0d1f0d",
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  genderTagText: { fontSize: 10, color: "#3dbf3d" },
  exerciseInfo: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  exerciseName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ddd",
    marginBottom: 4,
    lineHeight: 18,
  },
  exerciseMeta: { fontSize: 11, color: "#444", marginBottom: 6 },
  targetChip: {
    backgroundColor: "#1a2e1a",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  targetText: { fontSize: 10, color: "#3dbf3d", fontWeight: "600" },
  completeBtn: {
    width: 40,
    // height: 90,
    alignSelf: 'stretch',
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f0f0f",
  },
  completeBtnDone: { backgroundColor: "#0d1f0d" },
  completeBtnText: { fontSize: 18, color: "#3dbf3d" },

  allDoneBanner: {
    backgroundColor: "#0d1f0d",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#1e3e1e",
    marginTop: 8,
  },
  allDoneEmoji: { fontSize: 40, marginBottom: 10 },
  allDoneTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3dbf3d",
    marginBottom: 6,
  },
  allDoneSub: {
    fontSize: 13,
    color: "#3a6e3a",
    textAlign: "center",
    lineHeight: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.9,
    borderWidth: 0.5,
    borderColor: "#222",
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 20,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: { color: "#666", fontSize: 14, fontWeight: "700" },
  modalGif: {
    width: "100%",
    height: 260,
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalContent: { padding: 24 },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f0f0f0",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  modalTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  modalTag: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  modalTagText: { fontSize: 12, color: "#777", fontWeight: "500" },
  modalSectionLabel: {
    fontSize: 11,
    color: "#3dbf3d",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    fontWeight: "600",
  },
  modalBodyText: {
    fontSize: 13,
    color: "#777",
    marginBottom: 16,
    lineHeight: 20,
  },
  instructionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  instructionNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1a2e1a",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  instructionNumText: { fontSize: 11, color: "#3dbf3d", fontWeight: "700" },
  instructionText: { flex: 1, fontSize: 13, color: "#888", lineHeight: 20 },
  modalCompleteBtn: {
    backgroundColor: "#3dbf3d",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  modalCompleteBtnDone: {
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#3dbf3d",
  },
  modalCompleteBtnText: { fontSize: 15, fontWeight: "700", color: "#0a0a0a" },
});
