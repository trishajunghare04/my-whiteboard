import React from "react";
import { FiBell, FiUsers, FiEdit2, FiStar } from "react-icons/fi";

const NOTIFS = [
  { id: 1, icon: <FiUsers size={16}/>, color: "#6C47FF", title: "Trisha invited you to Sprint Planning", time: "2 min ago", read: false },
  { id: 2, icon: <FiEdit2 size={16}/>, color: "#3B82F6", title: "Alex edited Brainstorming Board", time: "15 min ago", read: false },
  { id: 3, icon: <FiStar size={16}/>, color: "#F59E0B", title: "Your board was starred by Priya", time: "1 hr ago", read: true },
  { id: 4, icon: <FiBell size={16}/>, color: "#10B981", title: "Board saved successfully", time: "3 hr ago", read: true },
];

export default function NotificationsPage() {
  return (
    <div style={styles.page}>
      <div style={styles.list}>
        {NOTIFS.map(n => (
          <div key={n.id} style={{ ...styles.item, background: n.read ? "#fff" : "rgba(108,71,255,0.04)", borderLeft: n.read ? "3px solid transparent" : "3px solid #6C47FF" }}>
            <div style={{ ...styles.iconWrap, background: `${n.color}18`, color: n.color }}>{n.icon}</div>
            <div style={styles.itemBody}>
              <div style={styles.itemTitle}>{n.title}</div>
              <div style={styles.itemTime}>{n.time}</div>
            </div>
            {!n.read && <div style={styles.unreadDot} />}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 640 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  item: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", border: "1px solid #E2E8F0", borderRadius: 14, background: "#fff" },
  iconWrap: { width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: 500, color: "#0F172A" },
  itemTime: { fontSize: 12, color: "#94A3B8", marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: "50%", background: "#6C47FF", flexShrink: 0 },
};
