import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Ic, useApp } from "../context.jsx";
import { api, ago, fmtTime, initials } from "../api.js";

export default function ChatPage() {
  const { user, showToast } = useApp();
  const nav = useNavigate();

  const [activeTab, setActiveTab] = useState("chats"); // "chats" | "requests" | "directory"
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Active DM Chat State
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // ─── 1. Load Friends, Requests, and Directory ────────────────────────────────
  const loadChatData = async () => {
    try {
      const [fList, incReq, outReq, allUsers] = await Promise.all([
        api.get("/friends").catch(() => []),
        api.get("/friends/requests/incoming").catch(() => []),
        api.get("/friends/requests/outgoing").catch(() => []),
        api.get("/users").catch(() => []),
      ]);

      setFriends(Array.isArray(fList) ? fList : []);
      setIncomingRequests(Array.isArray(incReq) ? incReq : []);
      setOutgoingRequests(Array.isArray(outReq) ? outReq : []);
      setDirectoryUsers(Array.isArray(allUsers) ? allUsers : []);
    } catch (err) {
      console.warn("Load chat error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatData();
    const interval = setInterval(loadChatData, 4000);
    window.addEventListener("focus", loadChatData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", loadChatData);
    };
  }, []);

  // ─── 2. Fetch Messages for Selected Friend ──────────────────────────────────
  const fetchMessages = async (friendId) => {
    if (!friendId) return;
    try {
      const msgs = await api.get(`/messages/${friendId}`).catch(() => []);
      setMessages(Array.isArray(msgs) ? msgs : []);
      api.patch(`/messages/read/${friendId}`).catch(() => {});
    } catch (err) {
      console.warn("Fetch messages error:", err);
    }
  };

  useEffect(() => {
    if (selectedFriend) {
      fetchMessages(selectedFriend.id);
      const msgTimer = setInterval(() => fetchMessages(selectedFriend.id), 3000);
      return () => clearInterval(msgTimer);
    }
  }, [selectedFriend]);

  useEffect(() => {
    if (selectedFriend && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedFriend]);

  // ─── 3. Friend Request Actions ───────────────────────────────────────────────
  const handleSendRequest = async (receiverId) => {
    try {
      await api.post("/friends/request", { receiver_id: receiverId });
      showToast("Friend & Chat request sent! 🤝", "success");
      loadChatData();
    } catch (err) {
      showToast(err.message || "Request already sent", "info");
    }
  };

  const handleAcceptRequest = async (requestId, senderName) => {
    try {
      await api.put(`/friends/requests/${requestId}/accept`);
      showToast(`Connected with ${senderName}! You can now chat 💬`, "success");
      loadChatData();
      setActiveTab("chats");
    } catch (err) {
      showToast(err.message || "Failed to accept request", "error");
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await api.put(`/friends/requests/${requestId}/decline`);
      showToast("Request declined", "info");
      loadChatData();
    } catch (err) {
      showToast(err.message || "Failed to decline", "error");
    }
  };

  // ─── 4. Send Message ────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedFriend || sending) return;

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    const optimisticMsg = {
      id: Date.now(),
      sender_id: user?.id,
      receiver_id: selectedFriend.id,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await api.post("/messages", { receiver_id: selectedFriend.id, content: text });
      fetchMessages(selectedFriend.id);
    } catch (err) {
      showToast(err.message || "Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  // ─── 5. Upload File / Photo to Chat ─────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFriend) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
      showToast("Uploading attachment… 📎", "info", 1500);
      const res = await api.upload("/messages/upload", fd);
      const fileUrl = typeof res === "object" ? res.filename : file.name;
      const content = `[ATTACHMENT] ${fileUrl}`;
      await api.post("/messages", { receiver_id: selectedFriend.id, content });
      fetchMessages(selectedFriend.id);
      showToast("Photo sent! 🖼️", "success");
    } catch (err) {
      showToast(err.message || "Upload failed", "error");
    }
  };

  // ─── 6. Render 1-on-1 Full-Screen Active Chat View ──────────────────────────
  if (selectedFriend) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#0f172a", display: "flex", flexDirection: "column" }}>
        {/* Chat Top Header */}
        <div
          style={{
            background: "#1e293b",
            padding: "14px 16px",
            borderBottom: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            onClick={() => setSelectedFriend(null)}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <Ic.ChevronLeft />
          </button>

          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#ffffff",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {initials(selectedFriend.name)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedFriend.name}
            </div>
            <div style={{ fontSize: 12, color: "#38bdf8", textTransform: "capitalize" }}>
              {selectedFriend.role || "Team Member"} • 🟢 Active
            </div>
          </div>

          <button
            onClick={() => fetchMessages(selectedFriend.id)}
            style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#38bdf8", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
          >
            🔄 Sync
          </button>
        </div>

        {/* Message Thread Feed */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#64748b" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>
              <div style={{ fontWeight: 700, color: "#94a3b8" }}>You are connected with {selectedFriend.name}!</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Send a message to begin real-time site collaboration.</div>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMe = m.sender_id === user?.id || m.sender_name === user?.name;
              const isAtt = m.content?.startsWith("[ATTACHMENT]");
              return (
                <div
                  key={m.id || idx}
                  style={{
                    alignSelf: isMe ? "flex-end" : "flex-start",
                    maxWidth: "82%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMe ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      background: isMe ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#1e293b",
                      color: "#ffffff",
                      borderRadius: 16,
                      borderBottomRightRadius: isMe ? 4 : 16,
                      borderBottomLeftRadius: isMe ? 16 : 4,
                      padding: "10px 14px",
                      fontSize: 14,
                      lineHeight: 1.45,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                      border: isMe ? "none" : "1px solid #334155",
                    }}
                  >
                    {isAtt ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>🖼️</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{m.content.replace("[ATTACHMENT]", "Photo Attachment")}</span>
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 3, padding: "0 4px" }}>
                    {fmtTime(m.created_at)} {isMe && (m.read_at ? "✓✓" : "✓")}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Bottom Input Bar */}
        <form
          onSubmit={handleSendMessage}
          style={{
            background: "#1e293b",
            padding: "10px 14px",
            borderTop: "1px solid #334155",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <label style={{ cursor: "pointer", color: "#94a3b8", fontSize: 20, display: "flex", alignItems: "center" }}>
            📎
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>

          <input
            type="text"
            placeholder={`Message ${selectedFriend.name.split(" ")[0]}…`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              background: "#0f172a",
              border: "1.5px solid #334155",
              borderRadius: 24,
              padding: "10px 16px",
              color: "#f1f5f9",
              fontSize: 14,
              outline: "none",
            }}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: inputText.trim() ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "#334155",
              color: "#ffffff",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              cursor: inputText.trim() ? "pointer" : "default",
              boxShadow: inputText.trim() ? "0 2px 10px rgba(37,99,235,0.4)" : "none",
            }}
          >
            ➤
          </button>
        </form>
      </div>
    );
  }

  // ─── 7. Main Contacts & Request Hub ─────────────────────────────────────────
  const filteredFriends = friends.filter(
    (f) => !searchQuery || f.name?.toLowerCase().includes(searchQuery.toLowerCase()) || f.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const existingFriendOrPendingIds = new Set([
    user?.id,
    ...friends.map((f) => f.id),
    ...incomingRequests.map((r) => r.sender_id),
    ...outgoingRequests.map((r) => r.receiver_id),
  ]);

  const discoverableUsers = directoryUsers.filter((u) => !existingFriendOrPendingIds.has(u.id));

  return (
    <>
      <div className="top-bar">
        <h1>Team Chat & Messages</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={loadChatData}
            style={{
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px solid #334155",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🔄 Sync
          </button>
        </div>
      </div>

      <div className="page-content">
        {/* Tab Switcher */}
        <div className="chip-row" style={{ marginBottom: 14 }}>
          <button className={`chip ${activeTab === "chats" ? "active" : ""}`} onClick={() => setActiveTab("chats")}>
            💬 Chats ({friends.length})
          </button>
          <button className={`chip ${activeTab === "requests" ? "active" : ""}`} onClick={() => setActiveTab("requests")}>
            📬 Requests {incomingRequests.length > 0 && `(${incomingRequests.length})`}
          </button>
          <button className={`chip ${activeTab === "directory" ? "active" : ""}`} onClick={() => setActiveTab("directory")}>
            🔍 Find Colleagues ({discoverableUsers.length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
            <Ic.Search s={16} />
          </span>
          <input
            style={{
              width: "100%",
              background: "#1e293b",
              border: "1.5px solid #334155",
              borderRadius: 12,
              padding: "10px 12px 10px 38px",
              color: "#f1f5f9",
              fontSize: 14,
              outline: "none",
            }}
            placeholder="Search colleagues by name or role…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ─── TAB 1: ACTIVE CHATS ─── */}
        {activeTab === "chats" && (
          <>
            {filteredFriends.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
                <p>No active conversations yet</p>
                <button onClick={() => setActiveTab("directory")} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                  + Add Colleagues to Chat
                </button>
              </div>
            ) : (
              filteredFriends.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFriend(f)}
                  className="card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                    cursor: "pointer",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        color: "#ffffff",
                        fontSize: 15,
                      }}
                    >
                      {initials(f.name)}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: "#10b981",
                        border: "2px solid #1e293b",
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9" }}>{f.name}</div>
                      <span style={{ fontSize: 11, color: "#64748b" }}>Active</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#38bdf8", textTransform: "capitalize" }}>
                      {f.role || "Team Member"} • Tap to chat
                    </div>
                  </div>

                  <Ic.ChevronRight s={18} style={{ color: "#475569" }} />
                </div>
              ))
            )}
          </>
        )}

        {/* ─── TAB 2: FRIEND REQUESTS ─── */}
        {activeTab === "requests" && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Incoming Requests ({incomingRequests.length})</h3>
            {incomingRequests.length === 0 ? (
              <div className="card card-sm" style={{ textAlign: "center", padding: 20, color: "#64748b", marginBottom: 14 }}>
                No pending incoming chat requests
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div key={req.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff" }}>
                      {initials(req.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{req.name}</div>
                      <div style={{ fontSize: 12, color: "#38bdf8", textTransform: "capitalize" }}>{req.role || "Colleague"} wants to connect</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => handleDeclineRequest(req.id)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                      Decline
                    </button>
                    <button onClick={() => handleAcceptRequest(req.id, req.name)} className="btn btn-primary btn-sm" style={{ flex: 1, background: "#10b981" }}>
                      Accept & Chat 💬
                    </button>
                  </div>
                </div>
              ))
            )}

            {outgoingRequests.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: "18px 0 10px" }}>Sent Requests ({outgoingRequests.length})</h3>
                <div className="card card-sm" style={{ padding: 10 }}>
                  {outgoingRequests.map((req) => (
                    <div key={req.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #334155" }}>
                      <span style={{ fontSize: 13, color: "#f1f5f9" }}>User #{req.receiver_id}</span>
                      <span className="badge badge-warning" style={{ textTransform: "capitalize" }}>{req.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ─── TAB 3: FIND COLLEAGUES DIRECTORY ─── */}
        {activeTab === "directory" && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Company Workforce Directory</h3>
            {discoverableUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: 30 }}>
                <p>You are connected with all team members! 🎉</p>
              </div>
            ) : (
              discoverableUsers.map((u) => (
                <div key={u.id} className="card card-sm" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 13 }}>
                      {initials(u.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: "#38bdf8", textTransform: "capitalize" }}>{u.role || "Worker"}</div>
                    </div>
                  </div>
                  <button onClick={() => handleSendRequest(u.id)} className="btn btn-primary btn-sm" style={{ padding: "6px 12px", fontSize: 12 }}>
                    + Connect
                  </button>
                </div>
              ))
            )}
          </>
        )}

        <div style={{ height: 16 }} />
      </div>
    </>
  );
}
