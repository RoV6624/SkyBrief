import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import { MessageSquare, Send, Trash2 } from "lucide-react-native";

import { CloudCard } from "@/components/ui/CloudCard";
import { useTheme } from "@/theme/ThemeProvider";
import { colors } from "@/theme/tokens";

export interface BriefingNote {
  id: string;
  authorUid: string;
  authorName: string;
  authorRole: "student" | "instructor";
  text: string;
  createdAt: string; // ISO
}

interface NotesPanelProps {
  notes: BriefingNote[];
  currentUserUid: string;
  currentUserName: string;
  currentUserRole: "student" | "instructor";
  onAddNote: (text: string) => void;
  onDeleteNote?: (noteId: string) => void;
}

export function NotesPanel({
  notes,
  currentUserUid,
  currentUserName,
  currentUserRole,
  onAddNote,
  onDeleteNote,
}: NotesPanelProps) {
  const { isDark } = useTheme();
  const [newNote, setNewNote] = useState("");

  const textColor = isDark ? "#FFFFFF" : colors.stratus[900];
  const subColor = isDark ? colors.stratus[400] : colors.stratus[500];
  const inputBg = isDark ? colors.stratus[700] : colors.stratus[100];
  const borderColor = isDark ? colors.stratus[700] : colors.stratus[200];

  const handleSend = useCallback(() => {
    const trimmed = newNote.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddNote(trimmed);
    setNewNote("");
  }, [newNote, onAddNote]);

  const handleDelete = useCallback(
    (noteId: string) => {
      Alert.alert("Delete Note", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onDeleteNote?.(noteId);
          },
        },
      ]);
    },
    [onDeleteNote]
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  return (
    <CloudCard style={styles.container}>
      <View style={styles.header}>
        <MessageSquare
          size={18}
          color={isDark ? colors.stratus[400] : colors.stratus[600]}
        />
        <Text
          style={[
            styles.headerText,
            { color: isDark ? colors.stratus[400] : colors.stratus[600] },
          ]}
        >
          NOTES & ANNOTATIONS
        </Text>
        {notes.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.countText}>{notes.length}</Text>
          </View>
        )}
      </View>

      {/* Notes List */}
      {notes.length > 0 ? (
        <View style={styles.notesList}>
          {notes.map((note) => {
            const isOwn = note.authorUid === currentUserUid;
            const isInstructor = note.authorRole === "instructor";

            return (
              <View
                key={note.id}
                style={[
                  styles.noteCard,
                  {
                    backgroundColor: isInstructor
                      ? isDark
                        ? "rgba(212,168,83,0.1)"
                        : "rgba(212,168,83,0.08)"
                      : isDark
                      ? colors.stratus[800]
                      : colors.stratus[50],
                    borderColor: isInstructor
                      ? "rgba(212,168,83,0.2)"
                      : borderColor,
                  },
                ]}
              >
                <View style={styles.noteHeader}>
                  <View style={styles.noteAuthor}>
                    <View
                      style={[
                        styles.roleDot,
                        {
                          backgroundColor: isInstructor
                            ? colors.accent
                            : colors.stratus[400],
                        },
                      ]}
                    />
                    <Text style={[styles.authorName, { color: textColor }]}>
                      {note.authorName}
                    </Text>
                    <Text style={[styles.roleLabel, { color: subColor }]}>
                      {isInstructor ? "CFI" : "Student"}
                    </Text>
                  </View>
                  <View style={styles.noteActions}>
                    <Text style={[styles.timeText, { color: subColor }]}>
                      {formatTime(note.createdAt)}
                    </Text>
                    {isOwn && onDeleteNote && (
                      <Pressable
                        onPress={() => handleDelete(note.id)}
                        hitSlop={8}
                      >
                        <Trash2 size={14} color={colors.alert.red} />
                      </Pressable>
                    )}
                  </View>
                </View>
                <Text style={[styles.noteText, { color: textColor }]}>
                  {note.text}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: subColor }]}>
          No notes yet. {currentUserRole === "instructor" ? "Add feedback for your student." : "Ask your CFI a question."}
        </Text>
      )}

      {/* Input */}
      <View style={[styles.inputRow, { borderTopColor: borderColor }]}>
        <TextInput
          style={[
            styles.input,
            { color: textColor, backgroundColor: inputBg },
          ]}
          value={newNote}
          onChangeText={setNewNote}
          placeholder={
            currentUserRole === "instructor"
              ? "Add teaching note..."
              : "Ask a question..."
          }
          placeholderTextColor={isDark ? colors.stratus[600] : colors.stratus[300]}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleSend}
          disabled={!newNote.trim()}
          style={[
            styles.sendBtn,
            {
              backgroundColor: newNote.trim() ? colors.accent : inputBg,
            },
          ]}
        >
          <Send
            size={18}
            color={newNote.trim() ? "#FFFFFF" : subColor}
          />
        </Pressable>
      </View>
    </CloudCard>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  headerText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    letterSpacing: 0.5,
    flex: 1,
  },
  countBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFFFFF",
  },
  notesList: { gap: 10, marginBottom: 12 },
  noteCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  noteAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  authorName: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  roleLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  noteText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    padding: 10,
    borderRadius: 10,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
