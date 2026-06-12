"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  MousePointer2, Hand, StickyNote, Type as TypeIcon, Square, Circle as CircleIcon,
  Triangle, Diamond, Hexagon, Star, ArrowRight, Minus, PenTool, Eraser, Frame,
  Table as TableIcon, Disc3, ZoomIn, ZoomOut, Undo2, Redo2, Trash2, Copy, Lock,
  Unlock, ChevronUp, ChevronDown, Pin, PinOff, Map as MapIcon, Layers, Plus,
  X, Check, Search, Calendar, Flag, AlignLeft, AlignCenter, AlignRight, Bold,
  Italic, Underline, MessageSquare, Heart, ThumbsUp, Smile, Flame, Sparkles,
  Settings, ListChecks, GripVertical, Pencil, MoreHorizontal, LayoutGrid,
  Rows3, List as ListIcon, GanttChart, ChevronRight, FolderKanban, Save,
  Eye, EyeOff, RotateCw, Palette, Pipette,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────── */
/*  TYPES                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

type ToolId =
  | "select" | "hand" | "sticky" | "text" | "rect" | "circle" | "triangle"
  | "diamond" | "hexagon" | "star" | "arrow" | "line" | "pen" | "eraser"
  | "frame" | "table" | "spinner";

type ElementType =
  | "sticky" | "text" | "rect" | "circle" | "triangle" | "diamond" | "hexagon"
  | "star" | "arrow" | "line" | "pen" | "frame" | "table" | "spinner";

type Priority = "none" | "low" | "medium" | "high" | "urgent";
type KanbanStatus = "todo" | "inprogress" | "review" | "done";

type ChecklistItem = { id: string; text: string; done: boolean };
type CommentItem = { id: string; author: string; text: string; ts: number };
type SpinnerSegment = { id: string; label: string; color: string; weight: number };
type TableCell = string;

type CanvasElement = {
  id: string;
  type: ElementType;
  x: number; y: number; w: number; h: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  z: number;

  // text/content
  text?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  textColor?: string;

  // visual
  fill?: string;
  stroke?: string;
  strokeWidth?: number;

  // sticky-specific
  noteColor?: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  priority?: Priority;
  kanbanStatus?: KanbanStatus;
  labels?: string[];
  checklist?: ChecklistItem[];
  comments?: CommentItem[];
  reactions?: Record<string, number>;
  pinned?: boolean;

  // pen
  pathData?: string;

  // arrow
  arrowEnd?: boolean;

  // table
  tableCols?: string[];
  tableRows?: TableCell[][];

  // spinner
  spinnerSegments?: SpinnerSegment[];
};

type Board = { id: string; name: string };
type Employee = { id: string; name: string };

type ViewMode = "canvas" | "kanban" | "table" | "timeline" | "list";

/* ────────────────────────────────────────────────────────────────────────── */
/*  CONSTANTS                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

const STICKY_COLORS = [
  { id: "yellow", bg: "#fef9c3", border: "#facc15", dot: "#eab308" },
  { id: "pink",   bg: "#fce7f3", border: "#f9a8d4", dot: "#ec4899" },
  { id: "blue",   bg: "#dbeafe", border: "#93c5fd", dot: "#3b82f6" },
  { id: "green",  bg: "#dcfce7", border: "#86efac", dot: "#22c55e" },
  { id: "purple", bg: "#ede9fe", border: "#c4b5fd", dot: "#8b5cf6" },
  { id: "orange", bg: "#ffedd5", border: "#fdba74", dot: "#f97316" },
  { id: "slate",  bg: "#e2e8f0", border: "#94a3b8", dot: "#64748b" },
  { id: "red",    bg: "#fee2e2", border: "#fca5a5", dot: "#ef4444" },
  { id: "teal",   bg: "#ccfbf1", border: "#5eead4", dot: "#14b8a6" },
];

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  none:    { label: "None",    color: "#64748b", bg: "#f1f5f9" },
  low:     { label: "Low",     color: "#0284c7", bg: "#e0f2fe" },
  medium:  { label: "Medium",  color: "#ca8a04", bg: "#fef9c3" },
  high:    { label: "High",    color: "#ea580c", bg: "#ffedd5" },
  urgent:  { label: "Urgent",  color: "#dc2626", bg: "#fee2e2" },
};
const PRIORITY_CYCLE: Priority[] = ["none", "low", "medium", "high", "urgent"];

const KANBAN_META: Record<KanbanStatus, { label: string; color: string; bg: string }> = {
  todo:        { label: "To Do",       color: "#475569", bg: "#f1f5f9" },
  inprogress:  { label: "In Progress", color: "#0369a1", bg: "#e0f2fe" },
  review:      { label: "Review",      color: "#a16207", bg: "#fef9c3" },
  done:        { label: "Done",        color: "#15803d", bg: "#dcfce7" },
};
const KANBAN_CYCLE: KanbanStatus[] = ["todo", "inprogress", "review", "done"];

const FILL_SWATCHES = [
  "#ffffff", "#fef3c7", "#fce7f3", "#dbeafe", "#dcfce7", "#ede9fe",
  "#ffedd5", "#e2e8f0", "#fee2e2", "#ccfbf1", "#0f172a", "#6366f1",
];
const STROKE_SWATCHES = [
  "#0f172a", "#475569", "#94a3b8", "#6366f1", "#ec4899", "#22c55e",
  "#f97316", "#ef4444", "#14b8a6", "#a855f7", "#eab308", "#3b82f6",
];
const PEN_COLORS = ["#0f172a", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#f97316"];

const REACTION_ICONS = [
  { id: "heart", Icon: Heart },
  { id: "thumb", Icon: ThumbsUp },
  { id: "smile", Icon: Smile },
  { id: "fire",  Icon: Flame  },
  { id: "spark", Icon: Sparkles },
];

const TOOL_GROUPS: { id: ToolId; label: string; key: string; Icon: typeof MousePointer2 }[] = [
  { id: "select",   label: "Select",       key: "V", Icon: MousePointer2 },
  { id: "hand",     label: "Hand",         key: "H", Icon: Hand },
  { id: "sticky",   label: "Sticky note",  key: "S", Icon: StickyNote },
  { id: "text",     label: "Text",         key: "T", Icon: TypeIcon },
  { id: "rect",     label: "Rectangle",    key: "R", Icon: Square },
  { id: "circle",   label: "Circle",       key: "O", Icon: CircleIcon },
  { id: "triangle", label: "Triangle",     key: "",  Icon: Triangle },
  { id: "diamond",  label: "Diamond",      key: "",  Icon: Diamond },
  { id: "hexagon",  label: "Hexagon",      key: "",  Icon: Hexagon },
  { id: "star",     label: "Star",         key: "",  Icon: Star },
  { id: "arrow",    label: "Arrow",        key: "A", Icon: ArrowRight },
  { id: "line",     label: "Line",         key: "L", Icon: Minus },
  { id: "pen",      label: "Pen",          key: "P", Icon: PenTool },
  { id: "eraser",   label: "Eraser",       key: "E", Icon: Eraser },
  { id: "frame",    label: "Frame",        key: "F", Icon: Frame },
  { id: "table",    label: "Table",        key: "",  Icon: TableIcon },
  { id: "spinner",  label: "Spinner",      key: "",  Icon: Disc3 },
];

const SHAPE_TOOLS: ToolId[] = ["rect","circle","triangle","diamond","hexagon","star","arrow","line","frame","table","spinner"];

const DRAG_THRESHOLD = 4;
const HISTORY_LIMIT = 80;

/* ────────────────────────────────────────────────────────────────────────── */
/*  HELPERS                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 11);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const stickyColorById = (id?: string) =>
  STICKY_COLORS.find(c => c.id === id) ?? STICKY_COLORS[0];

const normalizeRect = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.max(8, Math.abs(b.x - a.x)),
  h: Math.max(8, Math.abs(b.y - a.y)),
});

const pointInRect = (px: number, py: number, r: { x: number; y: number; w: number; h: number }) =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

const supabaseClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

/* ────────────────────────────────────────────────────────────────────────── */
/*  DEFAULT ELEMENT FACTORIES                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function defaultElement(type: ElementType, x: number, y: number, w = 200, h = 200, z = 1): CanvasElement {
  const base: CanvasElement = { id: uid(), type, x, y, w, h, z, opacity: 1, rotation: 0 };
  switch (type) {
    case "sticky":
      return {
        ...base, w: 220, h: 220, noteColor: "yellow", text: "",
        fontSize: 14, priority: "none", kanbanStatus: "todo",
        checklist: [], comments: [], reactions: {}, labels: [], pinned: false,
      };
    case "text":
      return { ...base, w: 200, h: 40, text: "Type something…", fontSize: 18, textColor: "#0f172a", align: "left" };
    case "rect":
      return { ...base, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2 };
    case "circle":
      return { ...base, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2 };
    case "triangle":
    case "diamond":
    case "hexagon":
    case "star":
      return { ...base, fill: "#ffffff", stroke: "#0f172a", strokeWidth: 2 };
    case "arrow":
    case "line":
      return { ...base, w: 200, h: 2, stroke: "#0f172a", strokeWidth: 2, arrowEnd: type === "arrow" };
    case "pen":
      return { ...base, stroke: "#0f172a", strokeWidth: 3, pathData: "" };
    case "frame":
      return { ...base, w: 320, h: 220, text: "Frame", fill: "rgba(99,102,241,0.04)", stroke: "#6366f1", strokeWidth: 1.5 };
    case "table":
      return {
        ...base, w: 360, h: 200,
        tableCols: ["Column A", "Column B", "Column C"],
        tableRows: [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ],
        fill: "#ffffff", stroke: "#e2e8f0", strokeWidth: 1,
      };
    case "spinner":
      return {
        ...base, w: 260, h: 260,
        spinnerSegments: [
          { id: uid(), label: "Yes",   color: "#22c55e", weight: 1 },
          { id: uid(), label: "No",    color: "#ef4444", weight: 1 },
          { id: uid(), label: "Maybe", color: "#eab308", weight: 1 },
          { id: uid(), label: "Defer", color: "#6366f1", weight: 1 },
        ],
      };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  MAIN COMPONENT                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

export default function WhiteboardPage() {
  const supabase = useMemo(() => supabaseClient(), []);

  // boards + elements
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [loading, setLoading] = useState(true);

  // employees (for sticky assignee)
  const [employees, setEmployees] = useState<Employee[]>([]);

  // ui state
  const [tool, setTool] = useState<ToolId>("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("canvas");
  const [showBoardsSidebar, setShowBoardsSidebar] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);

  // pen settings
  const [penColor, setPenColor] = useState("#0f172a");
  const [penSize, setPenSize] = useState(3);

  // viewport
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // history
  const historyRef = useRef<CanvasElement[][]>([]);
  const futureRef = useRef<CanvasElement[][]>([]);

  // interaction refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{
    mode: "idle" | "drawing" | "panning" | "moving" | "resizing" | "marquee" | "erasing" | "pen";
    startScreen: { x: number; y: number };
    startCanvas: { x: number; y: number };
    lastScreen: { x: number; y: number };
    panStart?: { x: number; y: number };
    drawType?: ElementType;
    drawId?: string;
    moveOffsets?: Record<string, { dx: number; dy: number }>;
    resizeHandle?: string;
    resizeOriginal?: Record<string, CanvasElement>;
    penPoints?: { x: number; y: number }[];
    erasedThisGesture?: Set<string>;
    didDrag?: boolean;
  }>({
    mode: "idle",
    startScreen: { x: 0, y: 0 },
    startCanvas: { x: 0, y: 0 },
    lastScreen: { x: 0, y: 0 },
  });

  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  /* ─────── derived ─────── */

  const selectedElements = useMemo(
    () => elements.filter(e => selectedIds.has(e.id)),
    [elements, selectedIds]
  );
  const primarySelected = selectedElements[0];

  /* ─────── persistence ─────── */

  const orgIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    orgIdRef.current = localStorage.getItem("activeOrgId");
    loadBoards();
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployees = async () => {
    const { data } = await supabase.from("employees").select("id, name").limit(500);
    if (data) setEmployees(data as Employee[]);
  };

  const loadBoards = async () => {
    const orgId = orgIdRef.current;
    if (!orgId) { setLoading(false); return; }
    const { data } = await supabase
      .from("whiteboards")
      .select("id, name")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });
    if (data && data.length) {
      setBoards(data as Board[]);
      setActiveBoardId(data[0].id);
    } else {
      // auto-create default board
      const { data: created } = await supabase
        .from("whiteboards")
        .insert({ org_id: orgId, name: "My Board" })
        .select("id, name")
        .single();
      if (created) {
        setBoards([created as Board]);
        setActiveBoardId((created as Board).id);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!activeBoardId) return;
    loadBoardElements(activeBoardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoardId]);

  const loadBoardElements = async (boardId: string) => {
    const { data } = await supabase
      .from("whiteboard_notes")
      .select("*")
      .eq("board_id", boardId)
      .order("z_index", { ascending: true });
    if (!data) { setElements([]); return; }
    const mapped: CanvasElement[] = data.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      type: r.type as ElementType,
      x: Number(r.x ?? 0), y: Number(r.y ?? 0),
      w: Number(r.w ?? 200), h: Number(r.h ?? 200),
      z: Number(r.z_index ?? 1),
      rotation: Number(r.rotation ?? 0),
      opacity: Number(r.opacity ?? 1),
      locked: Boolean(r.locked),
      text: (r.text ?? r.content ?? "") as string,
      fontSize: Number(r.font_size ?? 14),
      bold: Boolean(r.font_bold),
      italic: Boolean(r.font_italic),
      underline: Boolean(r.font_underline),
      align: (r.text_align as "left" | "center" | "right") ?? "left",
      textColor: (r.text_color as string) ?? "#0f172a",
      fill: (r.fill as string) ?? "#ffffff",
      stroke: (r.stroke as string) ?? "#0f172a",
      strokeWidth: Number(r.stroke_width ?? 2),
      noteColor: (r.note_color as string) ?? "yellow",
      assigneeId: (r.assignee_id as string) ?? null,
      dueDate: (r.due_date as string) ?? null,
      priority: ((r.priority as Priority) ?? "none"),
      kanbanStatus: ((r.kanban_status as KanbanStatus) ?? "todo"),
      labels: (r.labels as string[]) ?? [],
      checklist: (r.checklist as ChecklistItem[]) ?? [],
      comments: (r.comments as CommentItem[]) ?? [],
      reactions: (r.reactions as Record<string, number>) ?? {},
      pinned: Boolean(r.pinned),
      pathData: (r.path_data as string) ?? "",
      arrowEnd: Boolean(r.arrow_end),
      tableCols: (r.table_cols as string[]) ?? undefined,
      tableRows: (r.table_rows as TableCell[][]) ?? undefined,
      spinnerSegments: (r.spinner_segments as SpinnerSegment[]) ?? undefined,
    }));
    setElements(mapped);
  };

  // debounced save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef<Set<string>>(new Set());
  const queueSave = (id: string) => {
    dirtyRef.current.add(id);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSaves, 600);
  };
  const flushSaves = async () => {
    if (!activeBoardId) return;
    const ids = Array.from(dirtyRef.current);
    dirtyRef.current.clear();
    const map = new Map(elements.map(e => [e.id, e]));
    for (const id of ids) {
      const e = map.get(id);
      if (!e) {
        await supabase.from("whiteboard_notes").delete().eq("id", id);
        continue;
      }
      await supabase.from("whiteboard_notes").upsert({
        id: e.id, board_id: activeBoardId, type: e.type,
        x: e.x, y: e.y, w: e.w, h: e.h, z_index: e.z,
        rotation: e.rotation ?? 0, opacity: e.opacity ?? 1, locked: e.locked ?? false,
        text: e.text ?? "", font_size: e.fontSize ?? 14,
        font_bold: e.bold ?? false, font_italic: e.italic ?? false, font_underline: e.underline ?? false,
        text_align: e.align ?? "left", text_color: e.textColor ?? "#0f172a",
        fill: e.fill ?? "#ffffff", stroke: e.stroke ?? "#0f172a", stroke_width: e.strokeWidth ?? 2,
        note_color: e.noteColor ?? "yellow", assignee_id: e.assigneeId ?? null,
        due_date: e.dueDate ?? null, priority: e.priority ?? "none",
        kanban_status: e.kanbanStatus ?? "todo", labels: e.labels ?? [],
        checklist: e.checklist ?? [], comments: e.comments ?? [],
        reactions: e.reactions ?? {}, pinned: e.pinned ?? false,
        path_data: e.pathData ?? "", arrow_end: e.arrowEnd ?? false,
        table_cols: e.tableCols ?? null, table_rows: e.tableRows ?? null,
        spinner_segments: e.spinnerSegments ?? null,
      });
    }
  };

  /* ─────── history ─────── */

  const pushHistory = useCallback(() => {
    historyRef.current.push(JSON.parse(JSON.stringify(elements)));
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    futureRef.current = [];
  }, [elements]);

  const undo = () => {
    if (!historyRef.current.length) return;
    futureRef.current.push(JSON.parse(JSON.stringify(elements)));
    const prev = historyRef.current.pop()!;
    setElements(prev);
    // mark everything dirty
    prev.forEach(e => queueSave(e.id));
  };

  const redo = () => {
    if (!futureRef.current.length) return;
    historyRef.current.push(JSON.parse(JSON.stringify(elements)));
    const next = futureRef.current.pop()!;
    setElements(next);
    next.forEach(e => queueSave(e.id));
  };

  /* ─────── mutations ─────── */

  const addElement = (el: CanvasElement, record = true) => {
    if (record) pushHistory();
    setElements(prev => [...prev, el]);
    queueSave(el.id);
  };

  const updateElement = (id: string, patch: Partial<CanvasElement>, record = false) => {
    if (record) pushHistory();
    setElements(prev => prev.map(e => (e.id === id ? { ...e, ...patch } : e)));
    queueSave(id);
  };

  const updateMany = (ids: string[], patch: Partial<CanvasElement>, record = true) => {
    if (record) pushHistory();
    setElements(prev => prev.map(e => (ids.includes(e.id) ? { ...e, ...patch } : e)));
    ids.forEach(queueSave);
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    pushHistory();
    const ids = Array.from(selectedIds);
    setElements(prev => prev.filter(e => !selectedIds.has(e.id)));
    ids.forEach(id => { dirtyRef.current.add(id); });
    setSelectedIds(new Set());
    setShowRightPanel(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSaves, 200);
  };

  const duplicateSelected = () => {
    if (selectedIds.size === 0) return;
    pushHistory();
    const newIds: string[] = [];
    setElements(prev => {
      const copies = prev
        .filter(e => selectedIds.has(e.id))
        .map(e => {
          const copy = { ...e, id: uid(), x: e.x + 24, y: e.y + 24, z: getMaxZ(prev) + 1 };
          newIds.push(copy.id);
          queueSave(copy.id);
          return copy;
        });
      return [...prev, ...copies];
    });
    setSelectedIds(new Set(newIds));
  };

  const bringForward = () => {
    if (selectedIds.size === 0) return;
    pushHistory();
    const maxZ = getMaxZ(elements);
    setElements(prev => prev.map(e => {
      if (selectedIds.has(e.id)) {
        const next = { ...e, z: maxZ + 1 };
        queueSave(e.id);
        return next;
      }
      return e;
    }));
  };

  const sendBack = () => {
    if (selectedIds.size === 0) return;
    pushHistory();
    const minZ = Math.min(...elements.map(e => e.z));
    setElements(prev => prev.map(e => {
      if (selectedIds.has(e.id)) {
        const next = { ...e, z: minZ - 1 };
        queueSave(e.id);
        return next;
      }
      return e;
    }));
  };

  const toggleLockSelected = () => {
    if (selectedIds.size === 0) return;
    pushHistory();
    const ids = Array.from(selectedIds);
    const anyUnlocked = elements.some(e => selectedIds.has(e.id) && !e.locked);
    updateMany(ids, { locked: anyUnlocked }, false);
  };

  const getMaxZ = (els: CanvasElement[]) =>
    els.length ? Math.max(...els.map(e => e.z)) : 0;

  /* ─────── viewport / coords ─────── */

  const screenToCanvas = useCallback((sx: number, sy: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (sx - rect.left - pan.x) / zoom,
      y: (sy - rect.top - pan.y) / zoom,
    };
  }, [pan.x, pan.y, zoom]);

  const zoomBy = (factor: number, originScreen?: { x: number; y: number }) => {
    setZoom(prevZoom => {
      const newZoom = clamp(prevZoom * factor, 0.15, 4);
      if (originScreen && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const ox = originScreen.x - rect.left;
        const oy = originScreen.y - rect.top;
        setPan(p => ({
          x: ox - ((ox - p.x) * newZoom / prevZoom),
          y: oy - ((oy - p.y) * newZoom / prevZoom),
        }));
      }
      return newZoom;
    });
  };

  const fitToContent = () => {
    if (!elements.length || !canvasRef.current) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    const minX = Math.min(...elements.map(e => e.x));
    const minY = Math.min(...elements.map(e => e.y));
    const maxX = Math.max(...elements.map(e => e.x + e.w));
    const maxY = Math.max(...elements.map(e => e.y + e.h));
    const w = maxX - minX, h = maxY - minY;
    const rect = canvasRef.current.getBoundingClientRect();
    const z = Math.min(rect.width / (w + 200), rect.height / (h + 200), 1.5);
    setZoom(z);
    setPan({
      x: rect.width / 2 - (minX + w / 2) * z,
      y: rect.height / 2 - (minY + h / 2) * z,
    });
  };

  /* ─────── hit testing ─────── */

  const elementUnderPoint = (p: { x: number; y: number }): CanvasElement | null => {
    // top-down: iterate by z descending
    const sorted = [...elements].sort((a, b) => b.z - a.z);
    for (const e of sorted) {
      if (e.locked) continue;
      if (pointInRect(p.x, p.y, e)) return e;
    }
    return null;
  };

  /* ─────── pointer handlers ─────── */

  const onCanvasPointerDown = (ev: ReactPointerEvent<HTMLDivElement>) => {
    if (ev.target instanceof HTMLElement && ev.target.closest("[data-no-canvas]")) return;
    const targetEl = ev.target as HTMLElement;
    const elementHit = targetEl.closest("[data-element-id]") as HTMLElement | null;
    const resizeHandle = targetEl.closest("[data-resize-handle]") as HTMLElement | null;

    const sp = { x: ev.clientX, y: ev.clientY };
    const cp = screenToCanvas(sp.x, sp.y);
    const ir = interactionRef.current;
    ir.startScreen = sp;
    ir.lastScreen = sp;
    ir.startCanvas = cp;
    ir.didDrag = false;

    // resize handle takes precedence
    if (resizeHandle && tool === "select") {
      const handle = resizeHandle.dataset.resizeHandle!;
      ir.mode = "resizing";
      ir.resizeHandle = handle;
      ir.resizeOriginal = {};
      selectedElements.forEach(e => { ir.resizeOriginal![e.id] = { ...e }; });
      pushHistory();
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      return;
    }

    // pan: hand tool or space-held or middle mouse
    if (tool === "hand" || ev.button === 1 || spaceHeldRef.current) {
      ir.mode = "panning";
      ir.panStart = { ...pan };
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      return;
    }

    // eraser
    if (tool === "eraser") {
      ir.mode = "erasing";
      ir.erasedThisGesture = new Set();
      pushHistory();
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      eraseAt(cp);
      return;
    }

    // pen
    if (tool === "pen") {
      ir.mode = "pen";
      ir.penPoints = [cp];
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      return;
    }

    // select / move
    if (tool === "select") {
      if (elementHit) {
        const id = elementHit.dataset.elementId!;
        const el = elements.find(e => e.id === id);
        if (!el) return;
        if (el.locked) return;
        // selection
        if (ev.shiftKey) {
          setSelectedIds(prev => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
          });
        } else if (!selectedIds.has(id)) {
          setSelectedIds(new Set([id]));
        }
        // start move
        ir.mode = "moving";
        ir.moveOffsets = {};
        const targets = selectedIds.has(id) ? Array.from(selectedIds) : [id];
        targets.forEach(tid => {
          const t = elements.find(e => e.id === tid);
          if (t) ir.moveOffsets![tid] = { dx: cp.x - t.x, dy: cp.y - t.y };
        });
        if (!selectedIds.has(id)) ir.moveOffsets![id] = { dx: cp.x - el.x, dy: cp.y - el.y };
        pushHistory();
        (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      } else {
        // marquee
        ir.mode = "marquee";
        setMarquee({ x: cp.x, y: cp.y, w: 0, h: 0 });
        if (!ev.shiftKey) setSelectedIds(new Set());
        (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      }
      return;
    }

    // drawing tools - record intent; only commit on drag
    if (SHAPE_TOOLS.includes(tool) || tool === "sticky" || tool === "text") {
      ir.mode = "drawing";
      ir.drawType = tool as ElementType;
      ir.drawId = undefined;
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
      return;
    }
  };

  const onCanvasPointerMove = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const ir = interactionRef.current;
    const sp = { x: ev.clientX, y: ev.clientY };
    const cp = screenToCanvas(sp.x, sp.y);
    const dxs = sp.x - ir.startScreen.x;
    const dys = sp.y - ir.startScreen.y;
    if (Math.abs(dxs) + Math.abs(dys) > DRAG_THRESHOLD) ir.didDrag = true;

    if (ir.mode === "panning") {
      setPan({ x: ir.panStart!.x + dxs, y: ir.panStart!.y + dys });
      return;
    }

    if (ir.mode === "erasing") {
      eraseAt(cp);
      return;
    }

    if (ir.mode === "pen") {
      if (!ir.didDrag) return; // require drag
      ir.penPoints!.push(cp);
      // live update by setting a temp element? we draw inline via state -> add element once we start
      if (!ir.drawId) {
        const id = uid();
        ir.drawId = id;
        const el: CanvasElement = {
          id, type: "pen", x: cp.x, y: cp.y, w: 1, h: 1, z: getMaxZ(elements) + 1,
          stroke: penColor, strokeWidth: penSize, pathData: "", opacity: 1,
        };
        setElements(prev => [...prev, el]);
      }
      // recompute path
      const pts = ir.penPoints!;
      if (pts.length < 2) return;
      const minX = Math.min(...pts.map(p => p.x));
      const minY = Math.min(...pts.map(p => p.y));
      const maxX = Math.max(...pts.map(p => p.x));
      const maxY = Math.max(...pts.map(p => p.y));
      const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x - minX} ${p.y - minY}`).join(" ");
      const id = ir.drawId!;
      setElements(prev => prev.map(e => e.id === id ? {
        ...e, x: minX, y: minY, w: Math.max(2, maxX - minX), h: Math.max(2, maxY - minY), pathData: d,
      } : e));
      return;
    }

    if (ir.mode === "drawing" && ir.drawType) {
      if (!ir.didDrag) return;
      const rect = normalizeRect(ir.startCanvas, cp);
      if (!ir.drawId) {
        // create on first drag
        const el = defaultElement(ir.drawType, rect.x, rect.y, rect.w, rect.h, getMaxZ(elements) + 1);
        ir.drawId = el.id;
        setElements(prev => [...prev, el]);
      } else {
        const id = ir.drawId;
        if (ir.drawType === "arrow" || ir.drawType === "line") {
          // store as raw coords using x,y → x+w, y+h (allow negative w/h via abs)
          setElements(prev => prev.map(e => e.id === id ? { ...e, x: ir.startCanvas.x, y: ir.startCanvas.y, w: cp.x - ir.startCanvas.x, h: cp.y - ir.startCanvas.y } : e));
        } else {
          setElements(prev => prev.map(e => e.id === id ? { ...e, ...rect } : e));
        }
      }
      return;
    }

    if (ir.mode === "moving") {
      const offsets = ir.moveOffsets!;
      setElements(prev => prev.map(e => {
        if (offsets[e.id] !== undefined) {
          return { ...e, x: cp.x - offsets[e.id].dx, y: cp.y - offsets[e.id].dy };
        }
        return e;
      }));
      return;
    }

    if (ir.mode === "resizing" && ir.resizeOriginal) {
      const handle = ir.resizeHandle!;
      const dx = (sp.x - ir.startScreen.x) / zoom;
      const dy = (sp.y - ir.startScreen.y) / zoom;
      setElements(prev => prev.map(e => {
        const orig = ir.resizeOriginal![e.id];
        if (!orig) return e;
        let { x, y, w, h } = orig;
        if (handle.includes("e")) w = Math.max(20, orig.w + dx);
        if (handle.includes("s")) h = Math.max(20, orig.h + dy);
        if (handle.includes("w")) { x = orig.x + dx; w = Math.max(20, orig.w - dx); }
        if (handle.includes("n")) { y = orig.y + dy; h = Math.max(20, orig.h - dy); }
        return { ...e, x, y, w, h };
      }));
      return;
    }

    if (ir.mode === "marquee") {
      const r = normalizeRect(ir.startCanvas, cp);
      setMarquee(r);
    }
  };

  const onCanvasPointerUp = (ev: ReactPointerEvent<HTMLDivElement>) => {
    const ir = interactionRef.current;
    const cp = ir.startCanvas;

    if (ir.mode === "panning") {
      ir.mode = "idle";
      return;
    }

    if (ir.mode === "erasing") {
      ir.mode = "idle";
      flushSaves();
      return;
    }

    if (ir.mode === "pen") {
      if (ir.drawId) queueSave(ir.drawId);
      else {
        // click without drag does nothing for pen
      }
      ir.mode = "idle";
      ir.penPoints = undefined;
      ir.drawId = undefined;
      return;
    }

    if (ir.mode === "drawing" && ir.drawType) {
      if (!ir.didDrag) {
        // click without drag: only sticky / text place at point
        if (ir.drawType === "sticky") {
          const el = defaultElement("sticky", cp.x - 110, cp.y - 110, 220, 220, getMaxZ(elements) + 1);
          addElement(el);
          setSelectedIds(new Set([el.id]));
          setTool("select");
        } else if (ir.drawType === "text") {
          const el = defaultElement("text", cp.x, cp.y - 12, 200, 40, getMaxZ(elements) + 1);
          addElement(el);
          setSelectedIds(new Set([el.id]));
          setEditingTextId(el.id);
          setTool("select");
        }
      } else if (ir.drawId) {
        queueSave(ir.drawId);
        setSelectedIds(new Set([ir.drawId]));
        setTool("select");
      }
      ir.mode = "idle";
      ir.drawId = undefined;
      ir.drawType = undefined;
      return;
    }

    if (ir.mode === "moving") {
      // commit positions
      selectedElements.forEach(e => queueSave(e.id));
      ir.mode = "idle";
      return;
    }

    if (ir.mode === "resizing") {
      selectedElements.forEach(e => queueSave(e.id));
      ir.mode = "idle";
      return;
    }

    if (ir.mode === "marquee" && marquee) {
      // select elements that intersect
      const hits = elements.filter(e => {
        const ex2 = e.x + e.w, ey2 = e.y + e.h;
        const mx2 = marquee.x + marquee.w, my2 = marquee.y + marquee.h;
        return e.x < mx2 && ex2 > marquee.x && e.y < my2 && ey2 > marquee.y;
      });
      setSelectedIds(prev => {
        const n = new Set(prev);
        hits.forEach(h => n.add(h.id));
        return n;
      });
      setMarquee(null);
      ir.mode = "idle";
      return;
    }

    ir.mode = "idle";
  };

  const eraseAt = (cp: { x: number; y: number }) => {
    const ir = interactionRef.current;
    const hit = elementUnderPoint(cp);
    if (hit && !ir.erasedThisGesture!.has(hit.id)) {
      ir.erasedThisGesture!.add(hit.id);
      setElements(prev => prev.filter(e => e.id !== hit.id));
      dirtyRef.current.add(hit.id);
    }
  };

  /* ─────── wheel zoom / pan ─────── */

  const onCanvasWheel = (ev: ReactWheelEvent<HTMLDivElement>) => {
    if (ev.ctrlKey || ev.metaKey) {
      ev.preventDefault();
      const factor = ev.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomBy(factor, { x: ev.clientX, y: ev.clientY });
    } else {
      setPan(p => ({ x: p.x - ev.deltaX, y: p.y - ev.deltaY }));
    }
  };

  /* ─────── keyboard ─────── */

  const spaceHeldRef = useRef(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;

      if (e.key === " " && !e.repeat) { spaceHeldRef.current = true; return; }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); return; }
      if (mod && e.key.toLowerCase() === "a") { e.preventDefault(); setSelectedIds(new Set(elements.map(el => el.id))); return; }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 0) { e.preventDefault(); deleteSelected(); return; }
      }
      if (e.key === "Escape") { setSelectedIds(new Set()); setEditingTextId(null); return; }

      const nudge = e.shiftKey ? 10 : 1;
      if (selectedIds.size > 0 && ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -nudge : e.key === "ArrowRight" ? nudge : 0;
        const dy = e.key === "ArrowUp" ? -nudge : e.key === "ArrowDown" ? nudge : 0;
        setElements(prev => prev.map(el => selectedIds.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el));
        selectedIds.forEach(queueSave);
        return;
      }

      const key = e.key.toLowerCase();
      const shortcuts: Record<string, ToolId> = {
        v: "select", h: "hand", s: "sticky", t: "text", r: "rect",
        o: "circle", a: "arrow", l: "line", p: "pen", e: "eraser", f: "frame",
      };
      if (shortcuts[key]) { setTool(shortcuts[key]); return; }
    };
    const handleUp = (e: KeyboardEvent) => {
      if (e.key === " ") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, selectedIds]);

  /* ─────── board ops ─────── */

  const createBoard = async () => {
    const orgId = orgIdRef.current;
    if (!orgId) return;
    const { data } = await supabase
      .from("whiteboards")
      .insert({ org_id: orgId, name: "Untitled board" })
      .select("id, name")
      .single();
    if (data) {
      setBoards(prev => [...prev, data as Board]);
      setActiveBoardId((data as Board).id);
      setRenamingBoardId((data as Board).id);
    }
  };

  const renameBoard = async (id: string, name: string) => {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, name } : b));
    await supabase.from("whiteboards").update({ name }).eq("id", id);
  };

  /* ─────── render: derived styles ─────── */

  const transformStyle: CSSProperties = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: "0 0",
  };

  const activeBoard = boards.find(b => b.id === activeBoardId);
  const stickyNotes = elements.filter(e => e.type === "sticky");

  /* ─────── render ─────── */

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900">
      {/* TOP BAR */}
      <header className="flex h-11 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3">
        <button
          onClick={() => setShowBoardsSidebar(s => !s)}
          className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          <FolderKanban size={14} className="text-indigo-600" />
          Northweblabs
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <button
          onClick={() => setShowBoardsSidebar(s => !s)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-900 hover:bg-slate-100"
        >
          {activeBoard?.name ?? "Loading…"}
          <ChevronDown size={12} />
        </button>

        {/* view tabs */}
        <div className="ml-4 flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          {([
            { id: "canvas",   label: "Canvas",   Icon: LayoutGrid },
            { id: "kanban",   label: "Kanban",   Icon: Rows3 },
            { id: "table",    label: "Table",    Icon: TableIcon },
            { id: "timeline", label: "Timeline", Icon: GanttChart },
            { id: "list",     label: "List",     Icon: ListIcon },
          ] as const).map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                view === v.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <v.Icon size={12} />
              {v.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={undo} title="Undo (⌘Z)" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <Undo2 size={14} />
          </button>
          <button onClick={redo} title="Redo (⌘Y)" className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <Redo2 size={14} />
          </button>
          <div className="mx-1 h-4 w-px bg-gray-200" />
          <button onClick={() => zoomBy(1 / 1.2)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <ZoomOut size={14} />
          </button>
          <button onClick={fitToContent} className="min-w-[3rem] rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => zoomBy(1.2)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <ZoomIn size={14} />
          </button>
          <div className="mx-1 h-4 w-px bg-gray-200" />
          <button
            onClick={() => setShowMinimap(s => !s)}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            title="Toggle minimap"
          >
            <MapIcon size={14} />
          </button>
        </div>
      </header>

      {/* MAIN ROW (left toolbar + canvas + right panel) */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT TOOLBAR */}
        <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-gray-200 bg-white py-2">
          {TOOL_GROUPS.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label}${t.key ? ` (${t.key})` : ""}`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${
                tool === t.id ? "bg-[#0f172a] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <t.Icon size={16} />
            </button>
          ))}

          {tool === "pen" && (
            <div className="mt-2 flex flex-col items-center gap-1 rounded-lg bg-slate-50 p-1.5">
              {PEN_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`h-5 w-5 rounded-full border-2 ${penColor === c ? "border-slate-900" : "border-white"}`}
                  style={{ background: c }}
                />
              ))}
              <div className="mt-1 flex flex-col items-center gap-1">
                {[2, 4, 6, 9].map(s => (
                  <button
                    key={s}
                    onClick={() => setPenSize(s)}
                    className={`flex h-5 w-5 items-center justify-center rounded-md ${penSize === s ? "bg-slate-900" : ""}`}
                  >
                    <span
                      className="block rounded-full"
                      style={{ width: s, height: s, background: penSize === s ? "#fff" : "#0f172a" }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* CANVAS / VIEWS */}
        <main className="relative flex-1 min-w-0 overflow-hidden bg-slate-50">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading board…</div>
          ) : view === "canvas" ? (
            <CanvasView
              canvasRef={canvasRef}
              elements={elements}
              selectedIds={selectedIds}
              transformStyle={transformStyle}
              tool={tool}
              marquee={marquee}
              pan={pan}
              zoom={zoom}
              employees={employees}
              editingTextId={editingTextId}
              setEditingTextId={setEditingTextId}
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onWheel={onCanvasWheel}
              updateElement={updateElement}
              setSelectedIds={setSelectedIds}
              setShowRightPanel={setShowRightPanel}
            />
          ) : view === "kanban" ? (
            <KanbanView
              stickyNotes={stickyNotes}
              employees={employees}
              updateElement={updateElement}
              pushHistory={pushHistory}
            />
          ) : view === "table" ? (
            <TableView stickyNotes={stickyNotes} employees={employees} updateElement={updateElement} />
          ) : view === "timeline" ? (
            <TimelineView stickyNotes={stickyNotes} employees={employees} />
          ) : (
            <ListView elements={elements} employees={employees} setSelectedIds={setSelectedIds} setShowRightPanel={setShowRightPanel} setView={setView} />
          )}

          {/* MINIMAP */}
          {view === "canvas" && showMinimap && elements.length > 0 && (
            <Minimap
              elements={elements}
              pan={pan}
              zoom={zoom}
              setPan={setPan}
              containerRef={canvasRef}
            />
          )}

          {/* BOTTOM SELECTION BAR */}
          {view === "canvas" && selectedElements.length > 0 && (
            <div
              data-no-canvas
              className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-gray-200 bg-white px-1.5 py-1 shadow-sm"
            >
              <button onClick={duplicateSelected} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <Copy size={12} /> Duplicate
              </button>
              <button onClick={() => setShowRightPanel(true)} className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100">
                <Settings size={12} />
              </button>
              <button onClick={toggleLockSelected} className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100">
                {primarySelected?.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
              <button onClick={bringForward} className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100">
                <ChevronUp size={12} />
              </button>
              <button onClick={sendBack} className="rounded-lg p-1.5 text-slate-700 hover:bg-slate-100">
                <ChevronDown size={12} />
              </button>
              <div className="mx-0.5 h-4 w-px bg-gray-200" />
              <button onClick={deleteSelected} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </main>

        {/* RIGHT PROPERTIES PANEL */}
        {showRightPanel && primarySelected && (
          <PropertiesPanel
            element={primarySelected}
            employees={employees}
            updateElement={updateElement}
            close={() => setShowRightPanel(false)}
          />
        )}
      </div>

      {/* BOARDS SIDEBAR */}
      {showBoardsSidebar && (
        <BoardsSidebar
          boards={boards}
          activeBoardId={activeBoardId}
          setActiveBoardId={setActiveBoardId}
          createBoard={createBoard}
          renameBoard={renameBoard}
          renamingBoardId={renamingBoardId}
          setRenamingBoardId={setRenamingBoardId}
          close={() => setShowBoardsSidebar(false)}
        />
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  CANVAS VIEW                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function CanvasView(props: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  elements: CanvasElement[];
  selectedIds: Set<string>;
  transformStyle: CSSProperties;
  tool: ToolId;
  marquee: { x: number; y: number; w: number; h: number } | null;
  pan: { x: number; y: number };
  zoom: number;
  employees: Employee[];
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onWheel: (e: ReactWheelEvent<HTMLDivElement>) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>, record?: boolean) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowRightPanel: (b: boolean) => void;
}) {
  const {
    canvasRef, elements, selectedIds, transformStyle, tool, marquee, zoom,
    employees, editingTextId, setEditingTextId,
    onPointerDown, onPointerMove, onPointerUp, onWheel, updateElement,
    setSelectedIds, setShowRightPanel,
  } = props;

  const cursorClass =
    tool === "hand" ? "cursor-grab" :
    tool === "eraser" ? "cursor-crosshair" :
    tool === "pen" ? "cursor-crosshair" :
    tool === "select" ? "cursor-default" :
    "cursor-crosshair";

  return (
    <div
      ref={canvasRef}
      className={`relative h-full w-full overflow-hidden ${cursorClass}`}
      style={{
        backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${transformStyle.transform ? "" : ""}`,
        backgroundColor: "#f8fafc",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div className="absolute inset-0" style={transformStyle}>
        {[...elements].sort((a, b) => a.z - b.z).map(el => (
          <ElementRenderer
            key={el.id}
            el={el}
            selected={selectedIds.has(el.id)}
            employees={employees}
            editingTextId={editingTextId}
            setEditingTextId={setEditingTextId}
            updateElement={updateElement}
            setSelectedIds={setSelectedIds}
            setShowRightPanel={setShowRightPanel}
          />
        ))}

        {/* Selection bounding box + handles */}
        {selectedIds.size > 0 && tool === "select" && (
          <SelectionOverlay elements={elements.filter(e => selectedIds.has(e.id))} />
        )}

        {/* marquee */}
        {marquee && (
          <div
            className="pointer-events-none absolute border border-indigo-500 bg-indigo-500/10"
            style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
          />
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  ELEMENT RENDERER                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function ElementRenderer(props: {
  el: CanvasElement;
  selected: boolean;
  employees: Employee[];
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>, record?: boolean) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowRightPanel: (b: boolean) => void;
}) {
  const { el, selected, employees, editingTextId, setEditingTextId, updateElement, setSelectedIds, setShowRightPanel } = props;

  const wrap: CSSProperties = {
    position: "absolute",
    left: el.x, top: el.y, width: el.w, height: el.h,
    opacity: el.opacity ?? 1,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    zIndex: el.z,
  };

  const openDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(new Set([el.id]));
    setShowRightPanel(true);
  };

  /* sticky */
  if (el.type === "sticky") {
    const color = stickyColorById(el.noteColor);
    const assignee = employees.find(emp => emp.id === el.assigneeId);
    const checklist = el.checklist ?? [];
    const checked = checklist.filter(c => c.done).length;
    const isEditing = editingTextId === el.id;

    return (
      <div
        data-element-id={el.id}
        style={wrap}
        className={`overflow-hidden rounded-xl shadow-sm ${selected ? "ring-2 ring-indigo-500" : ""}`}
      >
        <div className="flex h-full flex-col" style={{ background: color.bg, border: `1px solid ${color.border}` }}>
          {/* header */}
          <div className="flex items-center gap-1 border-b border-black/5 px-2 py-1.5">
            <div className="flex gap-0.5">
              {STICKY_COLORS.map(c => (
                <button
                  key={c.id}
                  data-no-canvas
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); updateElement(el.id, { noteColor: c.id }); }}
                  className={`h-2 w-2 rounded-full ${el.noteColor === c.id ? "ring-1 ring-slate-900 ring-offset-1" : ""}`}
                  style={{ background: c.dot }}
                />
              ))}
            </div>
            <div className="ml-auto flex items-center gap-0.5">
              {el.pinned && <Pin size={10} className="text-slate-700" />}
              <button
                data-no-canvas
                onPointerDown={(e) => e.stopPropagation()}
                onClick={openDetails}
                className="rounded p-0.5 text-slate-600 hover:bg-black/5"
              >
                <Settings size={10} />
              </button>
            </div>
          </div>

          {/* body */}
          <div
            className="flex-1 px-2.5 py-2"
            onDoubleClick={(e) => { e.stopPropagation(); setEditingTextId(el.id); }}
          >
            {isEditing ? (
              <textarea
                data-no-canvas
                autoFocus
                value={el.text ?? ""}
                onChange={(e) => updateElement(el.id, { text: e.target.value })}
                onBlur={() => setEditingTextId(null)}
                onPointerDown={(e) => e.stopPropagation()}
                className="h-full w-full resize-none bg-transparent text-sm leading-snug text-slate-900 outline-none"
                style={{ fontSize: el.fontSize ?? 14 }}
              />
            ) : (
              <div
                className="whitespace-pre-wrap text-sm leading-snug text-slate-900"
                style={{ fontSize: el.fontSize ?? 14 }}
              >
                {el.text || <span className="text-slate-400">Double-click to edit</span>}
              </div>
            )}

            {/* checklist */}
            {checklist.length > 0 && (
              <div className="mt-2 space-y-0.5">
                <div className="h-1 w-full rounded-full bg-black/10">
                  <div
                    className="h-1 rounded-full bg-slate-900 transition-all"
                    style={{ width: `${(checked / checklist.length) * 100}%` }}
                  />
                </div>
                {checklist.slice(0, 4).map(item => (
                  <label
                    key={item.id}
                    data-no-canvas
                    onPointerDown={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={(e) => {
                        updateElement(el.id, {
                          checklist: checklist.map(c => c.id === item.id ? { ...c, done: e.target.checked } : c),
                        });
                      }}
                      className="h-3 w-3 rounded border-slate-400"
                    />
                    <span className={item.done ? "line-through opacity-60" : ""}>{item.text}</span>
                  </label>
                ))}
                {checklist.length > 4 && (
                  <div className="text-[10px] text-slate-500">+{checklist.length - 4} more</div>
                )}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="flex items-center gap-1 border-t border-black/5 px-2 py-1">
            <button
              data-no-canvas
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const cur = PRIORITY_CYCLE.indexOf(el.priority ?? "none");
                const next = PRIORITY_CYCLE[(cur + 1) % PRIORITY_CYCLE.length];
                updateElement(el.id, { priority: next });
              }}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: PRIORITY_META[el.priority ?? "none"].bg,
                color: PRIORITY_META[el.priority ?? "none"].color,
              }}
            >
              <Flag size={9} />
              {PRIORITY_META[el.priority ?? "none"].label}
            </button>
            <button
              data-no-canvas
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const cur = KANBAN_CYCLE.indexOf(el.kanbanStatus ?? "todo");
                const next = KANBAN_CYCLE[(cur + 1) % KANBAN_CYCLE.length];
                updateElement(el.id, { kanbanStatus: next });
              }}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                background: KANBAN_META[el.kanbanStatus ?? "todo"].bg,
                color: KANBAN_META[el.kanbanStatus ?? "todo"].color,
              }}
            >
              {KANBAN_META[el.kanbanStatus ?? "todo"].label}
            </button>
            {assignee && (
              <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[8px] font-semibold text-white" title={assignee.name}>
                {assignee.name.slice(0, 1)}
              </span>
            )}
            {el.dueDate && (
              <span className="ml-auto flex items-center gap-0.5 text-[9px] font-medium text-slate-600">
                <Calendar size={8} />
                {el.dueDate}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* text */
  if (el.type === "text") {
    const isEditing = editingTextId === el.id;
    return (
      <div
        data-element-id={el.id}
        style={wrap}
        onDoubleClick={(e) => { e.stopPropagation(); setEditingTextId(el.id); }}
        className={selected ? "ring-2 ring-indigo-500" : ""}
      >
        {isEditing ? (
          <textarea
            data-no-canvas
            autoFocus
            value={el.text ?? ""}
            onChange={(e) => updateElement(el.id, { text: e.target.value })}
            onBlur={() => setEditingTextId(null)}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-full w-full resize-none bg-transparent outline-none"
            style={{
              fontSize: el.fontSize ?? 18,
              color: el.textColor ?? "#0f172a",
              fontWeight: el.bold ? 700 : 400,
              fontStyle: el.italic ? "italic" : "normal",
              textDecoration: el.underline ? "underline" : "none",
              textAlign: el.align ?? "left",
            }}
          />
        ) : (
          <div
            className="h-full w-full whitespace-pre-wrap"
            style={{
              fontSize: el.fontSize ?? 18,
              color: el.textColor ?? "#0f172a",
              fontWeight: el.bold ? 700 : 400,
              fontStyle: el.italic ? "italic" : "normal",
              textDecoration: el.underline ? "underline" : "none",
              textAlign: el.align ?? "left",
            }}
          >
            {el.text || <span className="text-slate-400">Type something…</span>}
          </div>
        )}
      </div>
    );
  }

  /* shapes via SVG */
  if (["rect", "circle", "triangle", "diamond", "hexagon", "star"].includes(el.type)) {
    return (
      <div data-element-id={el.id} style={wrap}>
        <svg width={el.w} height={el.h} viewBox={`0 0 ${el.w} ${el.h}`}>
          <ShapePath el={el} />
        </svg>
        {selected && (
          <div className="pointer-events-none absolute inset-0 ring-2 ring-indigo-500" />
        )}
      </div>
    );
  }

  /* arrow / line */
  if (el.type === "arrow" || el.type === "line") {
    const x1 = 0, y1 = 0, x2 = el.w, y2 = el.h;
    const minX = Math.min(x1, x2), minY = Math.min(y1, y2);
    const maxX = Math.max(x1, x2), maxY = Math.max(y1, y2);
    const W = Math.max(2, maxX - minX), H = Math.max(2, maxY - minY);
    return (
      <div
        data-element-id={el.id}
        style={{ ...wrap, left: el.x + Math.min(0, el.w), top: el.y + Math.min(0, el.h), width: W + 20, height: H + 20 }}
      >
        <svg width={W + 20} height={H + 20} viewBox={`-10 -10 ${W + 20} ${H + 20}`}>
          <defs>
            <marker id={`arrow-${el.id}`} markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill={el.stroke ?? "#0f172a"} />
            </marker>
          </defs>
          <line
            x1={x1 < x2 ? 0 : W}
            y1={y1 < y2 ? 0 : H}
            x2={x1 < x2 ? W : 0}
            y2={y1 < y2 ? H : 0}
            stroke={el.stroke ?? "#0f172a"}
            strokeWidth={el.strokeWidth ?? 2}
            markerEnd={el.type === "arrow" ? `url(#arrow-${el.id})` : undefined}
          />
        </svg>
        {selected && <div className="pointer-events-none absolute inset-0 ring-2 ring-indigo-500" />}
      </div>
    );
  }

  /* pen */
  if (el.type === "pen") {
    return (
      <div data-element-id={el.id} style={wrap}>
        <svg width={el.w} height={el.h} viewBox={`0 0 ${el.w} ${el.h}`} style={{ overflow: "visible" }}>
          <path
            d={el.pathData ?? ""}
            fill="none"
            stroke={el.stroke ?? "#0f172a"}
            strokeWidth={el.strokeWidth ?? 3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {selected && <div className="pointer-events-none absolute inset-0 ring-2 ring-indigo-500" />}
      </div>
    );
  }

  /* frame */
  if (el.type === "frame") {
    return (
      <div data-element-id={el.id} style={wrap}>
        <div
          className="h-full w-full rounded-xl"
          style={{
            background: el.fill,
            border: `${el.strokeWidth ?? 1.5}px dashed ${el.stroke ?? "#6366f1"}`,
          }}
        />
        <div className="absolute -top-5 left-0 rounded-md bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {el.text || "Frame"}
        </div>
        {selected && <div className="pointer-events-none absolute inset-0 ring-2 ring-indigo-500" />}
      </div>
    );
  }

  /* table */
  if (el.type === "table") {
    return (
      <TableElement
        el={el}
        selected={selected}
        wrap={wrap}
        updateElement={updateElement}
      />
    );
  }

  /* spinner */
  if (el.type === "spinner") {
    return (
      <SpinnerElement el={el} selected={selected} wrap={wrap} updateElement={updateElement} />
    );
  }

  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SHAPES                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

function ShapePath({ el }: { el: CanvasElement }) {
  const { w, h, type, fill = "#ffffff", stroke = "#0f172a", strokeWidth = 2 } = el;
  const sw = strokeWidth;
  if (type === "rect") {
    return <rect x={sw/2} y={sw/2} width={w - sw} height={h - sw} rx={6} ry={6} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
  if (type === "circle") {
    return <ellipse cx={w/2} cy={h/2} rx={w/2 - sw/2} ry={h/2 - sw/2} fill={fill} stroke={stroke} strokeWidth={sw} />;
  }
  if (type === "triangle") {
    return <polygon points={`${w/2},${sw} ${w-sw},${h-sw} ${sw},${h-sw}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
  }
  if (type === "diamond") {
    return <polygon points={`${w/2},${sw} ${w-sw},${h/2} ${w/2},${h-sw} ${sw},${h/2}`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
  }
  if (type === "hexagon") {
    const cx = w/2, cy = h/2, rx = w/2 - sw/2, ry = h/2 - sw/2;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${cx + rx * Math.cos(a)},${cy + ry * Math.sin(a)}`;
    }).join(" ");
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
  }
  if (type === "star") {
    const cx = w/2, cy = h/2;
    const r1 = Math.min(w, h)/2 - sw/2;
    const r2 = r1 * 0.5;
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? r1 : r2;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  TABLE ELEMENT                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function TableElement(props: {
  el: CanvasElement;
  selected: boolean;
  wrap: CSSProperties;
  updateElement: (id: string, patch: Partial<CanvasElement>, record?: boolean) => void;
}) {
  const { el, selected, wrap, updateElement } = props;
  const cols = el.tableCols ?? [];
  const rows = el.tableRows ?? [];

  const setCol = (i: number, value: string) => {
    const next = [...cols]; next[i] = value;
    updateElement(el.id, { tableCols: next });
  };
  const setCell = (r: number, c: number, value: string) => {
    const next = rows.map(row => [...row]);
    next[r][c] = value;
    updateElement(el.id, { tableRows: next });
  };
  const addRow = () => updateElement(el.id, { tableRows: [...rows, cols.map(() => "")] });
  const addCol = () => updateElement(el.id, {
    tableCols: [...cols, `Column ${String.fromCharCode(65 + cols.length)}`],
    tableRows: rows.map(r => [...r, ""]),
  });
  const removeRow = (i: number) => updateElement(el.id, { tableRows: rows.filter((_, idx) => idx !== i) });
  const removeCol = (i: number) => updateElement(el.id, {
    tableCols: cols.filter((_, idx) => idx !== i),
    tableRows: rows.map(r => r.filter((_, idx) => idx !== i)),
  });

  return (
    <div data-element-id={el.id} style={wrap} className={`overflow-hidden rounded-lg border ${selected ? "border-indigo-500 ring-2 ring-indigo-500" : "border-gray-200"} bg-white`}>
      <div className="h-full overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              {cols.map((c, i) => (
                <th key={i} className="border-b border-gray-200 px-2 py-1.5 text-left font-semibold">
                  <input
                    data-no-canvas
                    onPointerDown={(e) => e.stopPropagation()}
                    value={c}
                    onChange={(e) => setCol(i, e.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </th>
              ))}
              <th className="border-b border-gray-200 px-1 py-1.5 text-right">
                <button
                  data-no-canvas
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); addCol(); }}
                  className="rounded p-0.5 text-slate-500 hover:bg-slate-200"
                >
                  <Plus size={10} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="group">
                {row.map((cell, ci) => (
                  <td key={ci} className="border-b border-gray-100 px-2 py-1.5">
                    <input
                      data-no-canvas
                      onPointerDown={(e) => e.stopPropagation()}
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className="w-full bg-transparent outline-none"
                    />
                  </td>
                ))}
                <td className="border-b border-gray-100 px-1 py-1.5 text-right opacity-0 group-hover:opacity-100">
                  <button
                    data-no-canvas
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); removeRow(ri); }}
                    className="rounded p-0.5 text-slate-400 hover:text-red-600"
                  >
                    <X size={10} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={cols.length + 1} className="px-2 py-1">
                <button
                  data-no-canvas
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); addRow(); }}
                  className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900"
                >
                  <Plus size={10} /> Add row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SPINNER ELEMENT                                                           */
/* ────────────────────────────────────────────────────────────────────────── */

function SpinnerElement(props: {
  el: CanvasElement;
  selected: boolean;
  wrap: CSSProperties;
  updateElement: (id: string, patch: Partial<CanvasElement>, record?: boolean) => void;
}) {
  const { el, selected, wrap, updateElement } = props;
  const segments = el.spinnerSegments ?? [];
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const totalWeight = segments.reduce((s, x) => s + x.weight, 0) || 1;
  const size = Math.min(el.w, el.h) - 24;
  const cx = el.w / 2, cy = el.h / 2;
  const r = size / 2;

  let accum = 0;
  const paths = segments.map(seg => {
    const start = (accum / totalWeight) * Math.PI * 2 - Math.PI / 2;
    accum += seg.weight;
    const end = (accum / totalWeight) * Math.PI * 2 - Math.PI / 2;
    const large = (end - start) > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    return {
      seg,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`,
      mid: (start + end) / 2,
    };
  });

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const target = Math.random() * 360 + 360 * 6;
    const final = angle + target;
    setAngle(final);
    setTimeout(() => {
      // determine result
      const normalized = ((360 - (final % 360)) + 270) % 360; // pointer at top
      const tw = totalWeight;
      let a = 0;
      for (const seg of segments) {
        const segDeg = (seg.weight / tw) * 360;
        if (normalized >= a && normalized < a + segDeg) {
          setResult(seg.label);
          break;
        }
        a += segDeg;
      }
      setSpinning(false);
    }, 3200);
  };

  return (
    <div
      data-element-id={el.id}
      style={wrap}
      className={`flex flex-col items-center overflow-visible rounded-xl border bg-white p-2 ${selected ? "border-indigo-500 ring-2 ring-indigo-500" : "border-gray-200"}`}
    >
      <div className="relative" style={{ width: el.w - 16, height: el.h - 48 }}>
        <svg width={el.w - 16} height={el.h - 48} viewBox={`0 0 ${el.w} ${el.h - 32}`}>
          <g
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${angle}deg)`,
              transition: spinning ? "transform 3.1s cubic-bezier(0.17, 0.67, 0.27, 1)" : "none",
            }}
          >
            {paths.map((p, i) => (
              <g key={p.seg.id}>
                <path d={p.d} fill={p.seg.color} stroke="white" strokeWidth={2} />
                <text
                  x={cx + (r * 0.65) * Math.cos(p.mid)}
                  y={cy + (r * 0.65) * Math.sin(p.mid)}
                  fontSize={11}
                  fontWeight={700}
                  fill="white"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${(p.mid * 180 / Math.PI) + 90} ${cx + (r * 0.65) * Math.cos(p.mid)} ${cy + (r * 0.65) * Math.sin(p.mid)})`}
                  style={{ pointerEvents: "none" }}
                >
                  {p.seg.label.slice(0, 10)}
                </text>
              </g>
            ))}
          </g>
          <polygon points={`${cx - 8},${cy - r - 6} ${cx + 8},${cy - r - 6} ${cx},${cy - r + 6}`} fill="#0f172a" />
          <circle cx={cx} cy={cy} r={10} fill="white" stroke="#0f172a" strokeWidth={2} />
        </svg>
      </div>
      <div className="mt-1 flex w-full items-center gap-1">
        <button
          data-no-canvas
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); spin(); }}
          disabled={spinning}
          className="flex-1 rounded-lg bg-[#0f172a] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {spinning ? "Spinning…" : result ? `→ ${result}` : "Spin"}
        </button>
        <button
          data-no-canvas
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setShowEditor(s => !s); }}
          className="rounded-lg border border-gray-200 p-1 text-slate-700 hover:bg-slate-50"
        >
          <Settings size={12} />
        </button>
      </div>

      {showEditor && (
        <div
          data-no-canvas
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-full top-0 ml-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Segments</span>
            <button onClick={() => setShowEditor(false)} className="rounded p-0.5 hover:bg-slate-100">
              <X size={10} />
            </button>
          </div>
          <div className="space-y-1">
            {segments.map(seg => (
              <div key={seg.id} className="flex items-center gap-1">
                <input
                  type="color"
                  value={seg.color}
                  onChange={(ev) => {
                    const next = segments.map(s => s.id === seg.id ? { ...s, color: ev.target.value } : s);
                    updateElement(el.id, { spinnerSegments: next });
                  }}
                  className="h-6 w-6 cursor-pointer rounded border border-gray-200"
                />
                <input
                  value={seg.label}
                  onChange={(ev) => {
                    const next = segments.map(s => s.id === seg.id ? { ...s, label: ev.target.value } : s);
                    updateElement(el.id, { spinnerSegments: next });
                  }}
                  className="flex-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-xs outline-none"
                />
                <button
                  onClick={() => updateElement(el.id, { spinnerSegments: segments.filter(s => s.id !== seg.id) })}
                  className="rounded p-0.5 text-slate-400 hover:text-red-600"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <button
              onClick={() => updateElement(el.id, {
                spinnerSegments: [...segments, { id: uid(), label: "New", color: "#6366f1", weight: 1 }],
              })}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-gray-300 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-50"
            >
              <Plus size={10} /> Add segment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  SELECTION OVERLAY (resize handles)                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function SelectionOverlay({ elements }: { elements: CanvasElement[] }) {
  if (!elements.length) return null;
  const minX = Math.min(...elements.map(e => e.x));
  const minY = Math.min(...elements.map(e => e.y));
  const maxX = Math.max(...elements.map(e => e.x + e.w));
  const maxY = Math.max(...elements.map(e => e.y + e.h));
  const w = maxX - minX, h = maxY - minY;
  const handles = [
    { id: "nw", x: minX,         y: minY,         cursor: "nwse-resize" },
    { id: "n",  x: minX + w / 2, y: minY,         cursor: "ns-resize" },
    { id: "ne", x: minX + w,     y: minY,         cursor: "nesw-resize" },
    { id: "e",  x: minX + w,     y: minY + h / 2, cursor: "ew-resize" },
    { id: "se", x: minX + w,     y: minY + h,     cursor: "nwse-resize" },
    { id: "s",  x: minX + w / 2, y: minY + h,     cursor: "ns-resize" },
    { id: "sw", x: minX,         y: minY + h,     cursor: "nesw-resize" },
    { id: "w",  x: minX,         y: minY + h / 2, cursor: "ew-resize" },
  ];

  return (
    <>
      <div
        className="pointer-events-none absolute border-2 border-indigo-500"
        style={{ left: minX, top: minY, width: w, height: h }}
      />
      {handles.map(h => (
        <div
          key={h.id}
          data-resize-handle={h.id}
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-indigo-500 bg-white"
          style={{ left: h.x, top: h.y, cursor: h.cursor, zIndex: 9999 }}
        />
      ))}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  PROPERTIES PANEL                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function PropertiesPanel(props: {
  element: CanvasElement;
  employees: Employee[];
  updateElement: (id: string, patch: Partial<CanvasElement>, record?: boolean) => void;
  close: () => void;
}) {
  const { element, employees, updateElement, close } = props;
  const [empQuery, setEmpQuery] = useState("");
  const filteredEmps = employees.filter(e => e.name.toLowerCase().includes(empQuery.toLowerCase())).slice(0, 8);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="flex h-11 items-center justify-between border-b border-gray-200 px-3">
        <span className="text-xs font-semibold capitalize text-slate-900">{element.type} properties</span>
        <button onClick={close} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
          <X size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* position */}
        <Section title="Position & Size">
          <div className="grid grid-cols-2 gap-1.5">
            <NumberInput label="X" value={element.x} onChange={(v) => updateElement(element.id, { x: v })} />
            <NumberInput label="Y" value={element.y} onChange={(v) => updateElement(element.id, { y: v })} />
            <NumberInput label="W" value={element.w} onChange={(v) => updateElement(element.id, { w: v })} />
            <NumberInput label="H" value={element.h} onChange={(v) => updateElement(element.id, { h: v })} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <NumberInput label="Rotation" value={element.rotation ?? 0} onChange={(v) => updateElement(element.id, { rotation: v })} />
            <SliderInput
              label="Opacity"
              value={Math.round((element.opacity ?? 1) * 100)}
              min={0} max={100}
              onChange={(v) => updateElement(element.id, { opacity: v / 100 })}
            />
          </div>
        </Section>

        {/* sticky-specific */}
        {element.type === "sticky" && (
          <>
            <Section title="Sticky settings">
              <div className="mb-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-1">
                  {STICKY_COLORS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => updateElement(element.id, { noteColor: c.id })}
                      className={`h-6 w-6 rounded-md border-2 ${element.noteColor === c.id ? "border-slate-900" : "border-transparent"}`}
                      style={{ background: c.bg }}
                    />
                  ))}
                </div>
              </div>
              <div className="mb-2">
                <Label>Assignee</Label>
                <input
                  value={empQuery}
                  onChange={(e) => setEmpQuery(e.target.value)}
                  placeholder="Search employee…"
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                />
                {empQuery && (
                  <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-gray-200 bg-white">
                    {filteredEmps.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          updateElement(element.id, { assigneeId: emp.id });
                          setEmpQuery("");
                        }}
                        className="block w-full px-2 py-1 text-left text-xs hover:bg-slate-50"
                      >
                        {emp.name}
                      </button>
                    ))}
                  </div>
                )}
                {element.assigneeId && (
                  <div className="mt-1 flex items-center justify-between rounded-md bg-slate-50 px-2 py-1 text-xs">
                    {employees.find(e => e.id === element.assigneeId)?.name ?? "—"}
                    <button onClick={() => updateElement(element.id, { assigneeId: null })}>
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
              <div className="mb-2">
                <Label>Due date</Label>
                <input
                  type="date"
                  value={element.dueDate ?? ""}
                  onChange={(e) => updateElement(element.id, { dueDate: e.target.value || null })}
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-indigo-500"
                />
              </div>
              <div className="mb-2 grid grid-cols-2 gap-1.5">
                <div>
                  <Label>Priority</Label>
                  <select
                    value={element.priority ?? "none"}
                    onChange={(e) => updateElement(element.id, { priority: e.target.value as Priority })}
                    className="w-full rounded-md border border-gray-200 px-1.5 py-1 text-xs outline-none"
                  >
                    {PRIORITY_CYCLE.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    value={element.kanbanStatus ?? "todo"}
                    onChange={(e) => updateElement(element.id, { kanbanStatus: e.target.value as KanbanStatus })}
                    className="w-full rounded-md border border-gray-200 px-1.5 py-1 text-xs outline-none"
                  >
                    {KANBAN_CYCLE.map(s => <option key={s} value={s}>{KANBAN_META[s].label}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-2">
                <button
                  onClick={() => updateElement(element.id, { pinned: !element.pinned })}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-md py-1 text-xs font-semibold ${
                    element.pinned ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-700"
                  }`}
                >
                  {element.pinned ? <Pin size={11} /> : <PinOff size={11} />}
                  {element.pinned ? "Pinned" : "Pin note"}
                </button>
              </div>
            </Section>

            <Section title="Checklist">
              <ChecklistEditor element={element} updateElement={updateElement} />
            </Section>

            <Section title="Comments">
              <CommentsEditor element={element} updateElement={updateElement} />
            </Section>
          </>
        )}

        {/* text & content */}
        {(element.type === "sticky" || element.type === "text" || element.type === "frame") && (
          <Section title="Text">
            <textarea
              value={element.text ?? ""}
              onChange={(e) => updateElement(element.id, { text: e.target.value })}
              className="h-16 w-full resize-none rounded-md border border-gray-200 p-2 text-xs outline-none focus:border-indigo-500"
            />
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <NumberInput label="Size" value={element.fontSize ?? 14} onChange={(v) => updateElement(element.id, { fontSize: v })} />
              <div className="flex items-end gap-0.5">
                <ToggleBtn active={!!element.bold} onClick={() => updateElement(element.id, { bold: !element.bold })}><Bold size={11} /></ToggleBtn>
                <ToggleBtn active={!!element.italic} onClick={() => updateElement(element.id, { italic: !element.italic })}><Italic size={11} /></ToggleBtn>
                <ToggleBtn active={!!element.underline} onClick={() => updateElement(element.id, { underline: !element.underline })}><Underline size={11} /></ToggleBtn>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-0.5">
              <ToggleBtn active={element.align === "left"} onClick={() => updateElement(element.id, { align: "left" })}><AlignLeft size={11} /></ToggleBtn>
              <ToggleBtn active={element.align === "center"} onClick={() => updateElement(element.id, { align: "center" })}><AlignCenter size={11} /></ToggleBtn>
              <ToggleBtn active={element.align === "right"} onClick={() => updateElement(element.id, { align: "right" })}><AlignRight size={11} /></ToggleBtn>
            </div>
            <div className="mt-2">
              <Label>Text color</Label>
              <SwatchRow value={element.textColor ?? "#0f172a"} onChange={(v) => updateElement(element.id, { textColor: v })} options={STROKE_SWATCHES} />
            </div>
          </Section>
        )}

        {/* fill & stroke */}
        {element.type !== "sticky" && element.type !== "text" && element.type !== "pen" && (
          <Section title="Fill & stroke">
            <Label>Fill</Label>
            <SwatchRow value={element.fill ?? "#ffffff"} onChange={(v) => updateElement(element.id, { fill: v })} options={FILL_SWATCHES} />
            <div className="mt-2">
              <Label>Stroke</Label>
              <SwatchRow value={element.stroke ?? "#0f172a"} onChange={(v) => updateElement(element.id, { stroke: v })} options={STROKE_SWATCHES} />
            </div>
            <div className="mt-2">
              <NumberInput label="Stroke width" value={element.strokeWidth ?? 2} onChange={(v) => updateElement(element.id, { strokeWidth: v })} />
            </div>
          </Section>
        )}

        {/* pen */}
        {element.type === "pen" && (
          <Section title="Stroke">
            <Label>Color</Label>
            <SwatchRow value={element.stroke ?? "#0f172a"} onChange={(v) => updateElement(element.id, { stroke: v })} options={STROKE_SWATCHES} />
            <div className="mt-2">
              <NumberInput label="Width" value={element.strokeWidth ?? 3} onChange={(v) => updateElement(element.id, { strokeWidth: v })} />
            </div>
          </Section>
        )}

        {/* layer + lock */}
        <Section title="Layer">
          <div className="flex gap-1">
            <button
              onClick={() => updateElement(element.id, { locked: !element.locked })}
              className="flex flex-1 items-center justify-center gap-1 rounded-md bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {element.locked ? <Lock size={11} /> : <Unlock size={11} />}
              {element.locked ? "Locked" : "Lock"}
            </button>
          </div>
        </Section>
      </div>
    </aside>
  );
}

function ChecklistEditor({ element, updateElement }: { element: CanvasElement; updateElement: (id: string, patch: Partial<CanvasElement>) => void }) {
  const checklist = element.checklist ?? [];
  const [newText, setNewText] = useState("");
  return (
    <div className="space-y-1">
      {checklist.map(item => (
        <div key={item.id} className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={item.done}
            onChange={(e) => updateElement(element.id, { checklist: checklist.map(c => c.id === item.id ? { ...c, done: e.target.checked } : c) })}
            className="h-3 w-3"
          />
          <input
            value={item.text}
            onChange={(e) => updateElement(element.id, { checklist: checklist.map(c => c.id === item.id ? { ...c, text: e.target.value } : c) })}
            className="flex-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-xs outline-none"
          />
          <button onClick={() => updateElement(element.id, { checklist: checklist.filter(c => c.id !== item.id) })} className="text-slate-400 hover:text-red-600">
            <X size={10} />
          </button>
        </div>
      ))}
      <div className="flex gap-1">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newText.trim()) {
              updateElement(element.id, { checklist: [...checklist, { id: uid(), text: newText.trim(), done: false }] });
              setNewText("");
            }
          }}
          placeholder="Add item…"
          className="flex-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => {
            if (newText.trim()) {
              updateElement(element.id, { checklist: [...checklist, { id: uid(), text: newText.trim(), done: false }] });
              setNewText("");
            }
          }}
          className="rounded-md bg-slate-900 px-1.5 text-white"
        >
          <Plus size={11} />
        </button>
      </div>
    </div>
  );
}

function CommentsEditor({ element, updateElement }: { element: CanvasElement; updateElement: (id: string, patch: Partial<CanvasElement>) => void }) {
  const comments = element.comments ?? [];
  const [newText, setNewText] = useState("");
  return (
    <div className="space-y-1.5">
      {comments.map(c => (
        <div key={c.id} className="rounded-md bg-slate-50 p-1.5 text-xs">
          <div className="mb-0.5 flex items-center justify-between text-[10px] text-slate-500">
            <span className="font-semibold text-slate-700">{c.author}</span>
            <button onClick={() => updateElement(element.id, { comments: comments.filter(cm => cm.id !== c.id) })} className="text-slate-400 hover:text-red-600">
              <X size={10} />
            </button>
          </div>
          <div className="text-slate-700">{c.text}</div>
        </div>
      ))}
      <div className="flex gap-1">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newText.trim()) {
              updateElement(element.id, { comments: [...comments, { id: uid(), author: "You", text: newText.trim(), ts: Date.now() }] });
              setNewText("");
            }
          }}
          placeholder="Add a comment…"
          className="flex-1 rounded-md border border-gray-200 px-1.5 py-0.5 text-xs outline-none focus:border-indigo-500"
        />
        <button
          onClick={() => {
            if (newText.trim()) {
              updateElement(element.id, { comments: [...comments, { id: uid(), author: "You", text: newText.trim(), ts: Date.now() }] });
              setNewText("");
            }
          }}
          className="rounded-md bg-slate-900 px-1.5 text-white"
        >
          <MessageSquare size={10} />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  PROPERTY HELPERS                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[10px] font-semibold text-slate-600">{children}</div>;
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <div className="text-[10px] font-semibold text-slate-500">{label}</div>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-gray-200 px-1.5 py-1 text-xs outline-none focus:border-indigo-500"
      />
    </label>
  );
}

function SliderInput({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-500">{label}</span>
        <span className="text-[10px] text-slate-700">{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </label>
  );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md ${active ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
    >
      {children}
    </button>
  );
}

function SwatchRow({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`h-5 w-5 rounded-md border ${value === c ? "border-slate-900 ring-1 ring-slate-900" : "border-gray-200"}`}
          style={{ background: c }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-5 w-5 cursor-pointer rounded border border-gray-200"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 rounded-md border border-gray-200 px-1 py-0.5 text-[10px] outline-none"
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  BOARDS SIDEBAR                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

function BoardsSidebar(props: {
  boards: Board[];
  activeBoardId: string | null;
  setActiveBoardId: (id: string) => void;
  createBoard: () => void;
  renameBoard: (id: string, name: string) => void;
  renamingBoardId: string | null;
  setRenamingBoardId: (id: string | null) => void;
  close: () => void;
}) {
  const { boards, activeBoardId, setActiveBoardId, createBoard, renameBoard, renamingBoardId, setRenamingBoardId, close } = props;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={close} />
      <aside className="fixed left-0 top-11 bottom-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
          <span className="text-xs font-semibold text-slate-900">Boards</span>
          <div className="flex items-center gap-1">
            <button onClick={createBoard} className="rounded-md bg-[#0f172a] px-2 py-1 text-xs font-semibold text-white">
              <Plus size={11} className="inline" /> New
            </button>
            <button onClick={close} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-1.5">
          {boards.map(b => (
            <div
              key={b.id}
              className={`group flex items-center gap-1.5 rounded-lg px-2 py-1.5 ${
                b.id === activeBoardId ? "bg-indigo-50 text-indigo-900" : "hover:bg-slate-50"
              }`}
            >
              <FolderKanban size={12} className="text-slate-500" />
              {renamingBoardId === b.id ? (
                <input
                  autoFocus
                  defaultValue={b.name}
                  onBlur={(e) => { renameBoard(b.id, e.target.value || "Untitled"); setRenamingBoardId(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renameBoard(b.id, (e.target as HTMLInputElement).value || "Untitled");
                      setRenamingBoardId(null);
                    }
                  }}
                  className="flex-1 rounded border border-indigo-300 px-1 text-xs outline-none"
                />
              ) : (
                <button
                  onClick={() => { setActiveBoardId(b.id); close(); }}
                  onDoubleClick={() => setRenamingBoardId(b.id)}
                  className="flex-1 truncate text-left text-xs font-medium"
                >
                  {b.name}
                </button>
              )}
              <button
                onClick={() => setRenamingBoardId(b.id)}
                className="rounded p-0.5 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
              >
                <Pencil size={10} />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  MINIMAP                                                                   */
/* ────────────────────────────────────────────────────────────────────────── */

function Minimap(props: {
  elements: CanvasElement[];
  pan: { x: number; y: number };
  zoom: number;
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { elements, pan, zoom, setPan, containerRef } = props;
  const W = 180, H = 130;
  const minX = Math.min(...elements.map(e => e.x), 0);
  const minY = Math.min(...elements.map(e => e.y), 0);
  const maxX = Math.max(...elements.map(e => e.x + e.w), 800);
  const maxY = Math.max(...elements.map(e => e.y + e.h), 600);
  const cw = maxX - minX, ch = maxY - minY;
  const s = Math.min(W / cw, H / ch);
  const containerRect = containerRef.current?.getBoundingClientRect();
  const vpW = (containerRect?.width ?? 800) / zoom;
  const vpH = (containerRect?.height ?? 600) / zoom;
  const vpX = -pan.x / zoom;
  const vpY = -pan.y / zoom;

  const onClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = (e.clientX - rect.left) / s + minX;
    const cy = (e.clientY - rect.top) / s + minY;
    if (containerRect) {
      setPan({
        x: containerRect.width / 2 - cx * zoom,
        y: containerRect.height / 2 - cy * zoom,
      });
    }
  };

  return (
    <div
      data-no-canvas
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute bottom-3 left-3 z-30 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm"
    >
      <svg width={W} height={H} onClick={onClick} className="cursor-pointer rounded-md bg-slate-50">
        {elements.map(el => (
          <rect
            key={el.id}
            x={(el.x - minX) * s}
            y={(el.y - minY) * s}
            width={el.w * s}
            height={el.h * s}
            fill={el.type === "sticky" ? stickyColorById(el.noteColor).dot : "#94a3b8"}
            opacity={0.7}
          />
        ))}
        <rect
          x={(vpX - minX) * s}
          y={(vpY - minY) * s}
          width={vpW * s}
          height={vpH * s}
          fill="none"
          stroke="#6366f1"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  KANBAN VIEW                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

function KanbanView(props: {
  stickyNotes: CanvasElement[];
  employees: Employee[];
  updateElement: (id: string, patch: Partial<CanvasElement>, record?: boolean) => void;
  pushHistory: () => void;
}) {
  const { stickyNotes, employees, updateElement, pushHistory } = props;
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-4">
      {KANBAN_CYCLE.map(status => {
        const items = stickyNotes.filter(s => (s.kanbanStatus ?? "todo") === status);
        return (
          <div
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggingId) {
                pushHistory();
                updateElement(draggingId, { kanbanStatus: status });
                setDraggingId(null);
              }
            }}
            className="flex w-72 shrink-0 flex-col rounded-xl border border-gray-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: KANBAN_META[status].bg, color: KANBAN_META[status].color }}
                >
                  {KANBAN_META[status].label}
                </span>
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {items.map(s => {
                const color = stickyColorById(s.noteColor);
                const assignee = employees.find(e => e.id === s.assigneeId);
                const checklist = s.checklist ?? [];
                const checked = checklist.filter(c => c.done).length;
                return (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => setDraggingId(s.id)}
                    className="cursor-grab rounded-lg p-2 shadow-sm active:cursor-grabbing"
                    style={{ background: color.bg, border: `1px solid ${color.border}` }}
                  >
                    <div className="mb-1 line-clamp-3 text-xs text-slate-900">
                      {s.text || <span className="italic text-slate-400">Empty</span>}
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span
                        className="rounded px-1.5 py-0.5 font-semibold"
                        style={{ background: PRIORITY_META[s.priority ?? "none"].bg, color: PRIORITY_META[s.priority ?? "none"].color }}
                      >
                        {PRIORITY_META[s.priority ?? "none"].label}
                      </span>
                      {checklist.length > 0 && (
                        <span className="flex items-center gap-0.5 text-slate-600">
                          <ListChecks size={10} /> {checked}/{checklist.length}
                        </span>
                      )}
                      {s.dueDate && (
                        <span className="flex items-center gap-0.5 text-slate-600">
                          <Calendar size={10} /> {s.dueDate}
                        </span>
                      )}
                      {assignee && (
                        <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[8px] font-semibold text-white">
                          {assignee.name.slice(0, 1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="rounded-md border border-dashed border-gray-200 py-6 text-center text-[10px] text-slate-400">
                  No notes
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  TABLE VIEW                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

function TableView(props: {
  stickyNotes: CanvasElement[];
  employees: Employee[];
  updateElement: (id: string, patch: Partial<CanvasElement>, record?: boolean) => void;
}) {
  const { stickyNotes, employees, updateElement } = props;
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "text", dir: "asc" });

  const sorted = [...stickyNotes].sort((a, b) => {
    const va = (a as Record<string, unknown>)[sort.key] ?? "";
    const vb = (b as Record<string, unknown>)[sort.key] ?? "";
    if (va < vb) return sort.dir === "asc" ? -1 : 1;
    if (va > vb) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (key: string) =>
    setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });

  return (
    <div className="h-full overflow-auto p-4">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 bg-slate-50">
            <tr>
              {[
                { key: "text", label: "Note" },
                { key: "priority", label: "Priority" },
                { key: "kanbanStatus", label: "Status" },
                { key: "assigneeId", label: "Assignee" },
                { key: "dueDate", label: "Due" },
              ].map(c => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="cursor-pointer px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {c.label} {sort.key === c.key && (sort.dir === "asc" ? "↑" : "↓")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => {
              const assignee = employees.find(e => e.id === s.assigneeId);
              return (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-slate-900">
                    <input
                      value={s.text ?? ""}
                      onChange={(e) => updateElement(s.id, { text: e.target.value })}
                      className="w-full bg-transparent outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={s.priority ?? "none"}
                      onChange={(e) => updateElement(s.id, { priority: e.target.value as Priority })}
                      className="rounded-md border border-gray-200 px-1.5 py-0.5 text-xs"
                    >
                      {PRIORITY_CYCLE.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={s.kanbanStatus ?? "todo"}
                      onChange={(e) => updateElement(s.id, { kanbanStatus: e.target.value as KanbanStatus })}
                      className="rounded-md border border-gray-200 px-1.5 py-0.5 text-xs"
                    >
                      {KANBAN_CYCLE.map(k => <option key={k} value={k}>{KANBAN_META[k].label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{assignee?.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={s.dueDate ?? ""}
                      onChange={(e) => updateElement(s.id, { dueDate: e.target.value || null })}
                      className="rounded-md border border-gray-200 px-1.5 py-0.5 text-xs"
                    />
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-slate-400">No sticky notes yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  TIMELINE VIEW                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

function TimelineView({ stickyNotes, employees }: { stickyNotes: CanvasElement[]; employees: Employee[] }) {
  const withDue = stickyNotes.filter(s => s.dueDate);
  if (!withDue.length) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">No sticky notes with due dates</div>;
  }
  const today = new Date();
  const start = new Date(today); start.setDate(start.getDate() - 7);
  const end = new Date(today); end.setDate(end.getDate() + 30);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  const dayWidth = 32;

  const dayHeaders = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="h-full overflow-auto p-4">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex border-b border-gray-200">
          <div className="w-48 shrink-0 border-r border-gray-200 px-3 py-2 text-xs font-semibold text-slate-700">Note</div>
          <div className="flex">
            {dayHeaders.map((d, i) => (
              <div key={i} className="shrink-0 border-r border-gray-100 text-center" style={{ width: dayWidth }}>
                <div className="px-1 py-1 text-[9px] font-semibold text-slate-500">{d.toLocaleDateString(undefined, { month: "short" })}</div>
                <div className="px-1 pb-1 text-[10px] text-slate-700">{d.getDate()}</div>
              </div>
            ))}
          </div>
        </div>
        {withDue.map(s => {
          const color = stickyColorById(s.noteColor);
          const due = new Date(s.dueDate!);
          const offset = Math.floor((due.getTime() - start.getTime()) / 86400000);
          const assignee = employees.find(e => e.id === s.assigneeId);
          return (
            <div key={s.id} className="flex border-b border-gray-100">
              <div className="w-48 shrink-0 border-r border-gray-200 px-3 py-2">
                <div className="line-clamp-1 text-xs font-medium text-slate-900">{s.text || "Untitled"}</div>
                {assignee && <div className="text-[10px] text-slate-500">{assignee.name}</div>}
              </div>
              <div className="relative flex" style={{ width: dayWidth * totalDays }}>
                {dayHeaders.map((_, i) => (
                  <div key={i} className="shrink-0 border-r border-gray-50" style={{ width: dayWidth }} />
                ))}
                <div
                  className="absolute top-1.5 h-6 rounded-md border px-2 text-[10px] font-semibold leading-6"
                  style={{
                    left: offset * dayWidth + 4,
                    width: dayWidth * 3 - 8,
                    background: color.bg,
                    borderColor: color.border,
                    color: "#0f172a",
                  }}
                >
                  {s.text?.slice(0, 24) || "Note"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  LIST VIEW                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

function ListView(props: {
  elements: CanvasElement[];
  employees: Employee[];
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowRightPanel: (b: boolean) => void;
  setView: (v: ViewMode) => void;
}) {
  const { elements, employees, setSelectedIds, setShowRightPanel, setView } = props;
  return (
    <div className="h-full overflow-auto p-4">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          All elements ({elements.length})
        </div>
        <div className="divide-y divide-gray-100">
          {elements.map(el => {
            const assignee = employees.find(e => e.id === el.assigneeId);
            return (
              <button
                key={el.id}
                onClick={() => { setSelectedIds(new Set([el.id])); setShowRightPanel(true); setView("canvas"); }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
              >
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-semibold capitalize"
                  style={{ background: el.type === "sticky" ? stickyColorById(el.noteColor).bg : "#f1f5f9", color: "#0f172a" }}
                >
                  {el.type}
                </span>
                <div className="min-w-0 flex-1 truncate text-xs text-slate-900">
                  {el.text || <span className="italic text-slate-400">No text</span>}
                </div>
                {assignee && <span className="text-[10px] text-slate-500">{assignee.name}</span>}
                {el.dueDate && (
                  <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                    <Calendar size={10} /> {el.dueDate}
                  </span>
                )}
                <ChevronRight size={12} className="text-slate-300" />
              </button>
            );
          })}
          {elements.length === 0 && (
            <div className="py-12 text-center text-xs text-slate-400">No elements yet</div>
          )}
        </div>
      </div>
    </div>
  );
}