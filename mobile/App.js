import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";

const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";
const C = {
  ink: "#1E2421",
  green: "#1F5C46",
  cream: "#F7F4EE",
  line: "#E4DFD3",
  muted: "#69716D",
  white: "#FFFFFF",
  danger: "#A23A32",
};

async function api(path, options = {}, token) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong.");
    error.code = data.code;
    error.suspensionReason = data.suspensionReason;
    throw error;
  }
  return data;
}

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [screen, setScreen] = useState(null);
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    SecureStore.getItemAsync("skillconnect_token").then(async (saved) => {
      if (saved) {
        try {
          const data = await api("/me", {}, saved);
          setToken(saved);
          setUser(data.user);
        } catch {
          await SecureStore.deleteItemAsync("skillconnect_token");
        }
      }
      setBooting(false);
    });
  }, []);
  async function login(nextToken, nextUser) {
    await SecureStore.setItemAsync("skillconnect_token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }
  async function logout() {
    await SecureStore.deleteItemAsync("skillconnect_token");
    setToken(null);
    setUser(null);
    setScreen(null);
    setTab("home");
  }
  if (booting) return <Loading />;
  if (!user) return <Auth onLogin={login} />;
  const openChat = (id) => setScreen({ type: "chat", id });
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {screen?.type === "artisan" && (
        <Artisan
          id={screen.id}
          user={user}
          token={token}
          openChat={openChat}
          back={() => setScreen(null)}
        />
      )}
      {screen?.type === "product" && (
        <Product
          id={screen.id}
          user={user}
          token={token}
          openChat={openChat}
          back={() => setScreen(null)}
        />
      )}
      {screen?.type === "chat" && (
        <Chat
          id={screen.id}
          user={user}
          token={token}
          back={() => setScreen(null)}
        />
      )}
      {!screen && tab === "home" && (
        <Home
          openArtisan={(id) => setScreen({ type: "artisan", id })}
          openProduct={(id) => setScreen({ type: "product", id })}
        />
      )}
      {!screen && tab === "inbox" && (
        <Inbox token={token} user={user} openChat={openChat} />
      )}
      {!screen && tab === "orders" && <Orders token={token} user={user} />}
      {!screen && tab === "profile" && <Profile user={user} logout={logout} />}
      {!screen && <Tabs tab={tab} setTab={setTab} />}
    </SafeAreaView>
  );
}

function Loading() {
  return (
    <SafeAreaView style={[styles.safe, styles.center]}>
      <ActivityIndicator color={C.green} size="large" />
    </SafeAreaView>
  );
}

function Auth({ onLogin }) {
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(values) {
    setBusy(true);
    setError("");
    try {
      const data = await api(`/auth/${signup ? "signup" : "login"}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      if (signup)
        setError(data.message || "Check your email to verify your account.");
      else await onLogin(data.token, data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <AuthForm
        signup={signup}
        busy={busy}
        error={error}
        onSubmit={submit}
        toggle={() => {
          setSignup(!signup);
          setError("");
        }}
      />
    </SafeAreaView>
  );
}

function AuthForm({ signup, busy, error, onSubmit, toggle }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  return (
    <ScrollView contentContainerStyle={styles.auth}>
      <Text style={styles.brand}>
        SkillConnect<Text style={{ color: C.green }}>HUB</Text>
      </Text>
      <Text style={styles.eyebrow}>LOCAL SKILLS · DIRECT CONVERSATIONS</Text>
      <Text style={styles.title}>
        {signup ? "Create your account" : "Welcome back"}
      </Text>
      <Text style={styles.muted}>
        {signup
          ? "Find an artisan, start a conversation, and pay safely."
          : "Sign in to continue your conversations."}
      </Text>
      {signup && <Field label="Name" value={name} onChangeText={setName} />}
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {signup && (
        <>
          <Text style={styles.label}>Account type</Text>
          <View style={styles.segment}>
            <Pressable
              style={[
                styles.segmentButton,
                role === "customer" && styles.segmentActive,
              ]}
              onPress={() => setRole("customer")}
            >
              <Text>Customer</Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentButton,
                role === "artisan" && styles.segmentActive,
              ]}
              onPress={() => setRole("artisan")}
            >
              <Text>Artisan</Text>
            </Pressable>
          </View>
        </>
      )}
      <Button
        title={busy ? "Please wait…" : signup ? "Create account" : "Log in"}
        disabled={busy}
        onPress={() => onSubmit({ name, email, password, role })}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={toggle}>
        <Text style={styles.link}>
          {signup
            ? "Already have an account? Log in"
            : "Need an account? Sign up"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Home({ openArtisan, openProduct }) {
  const [service, setService] = useState("");
  const [area, setArea] = useState("");
  const [artisans, setArtisans] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  async function search() {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        api(
          `/artisans?service=${encodeURIComponent(service)}&area=${encodeURIComponent(area)}`,
        ),
        api(
          `/products?search=${encodeURIComponent(service)}&area=${encodeURIComponent(area)}`,
        ),
      ]);
      setArtisans(a);
      setProducts(p);
    } catch (e) {
      Alert.alert("Could not load marketplace", e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    search();
  }, []);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>LOCAL SKILLS · DIRECT CONVERSATIONS</Text>
      <Text style={styles.title}>Find an artisan.</Text>
      <Text style={styles.lead}>
        Send a message, agree on the details, and pay safely inside
        SkillConnect-HUB.
      </Text>
      <Field
        label="Skill or product"
        value={service}
        onChangeText={setService}
        placeholder="Tailor, phone repair…"
      />
      <Field
        label="Area"
        value={area}
        onChangeText={setArea}
        placeholder="Your area"
      />
      <Button title="Search" onPress={search} />
      {loading ? (
        <ActivityIndicator color={C.green} />
      ) : (
        <>
          <SectionTitle title={`Artisans (${artisans.length})`} />
          {artisans.map((item) => (
            <Card key={item.id} onPress={() => openArtisan(item.id)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.muted}>
                {item.skill} · {item.area}
              </Text>
              <Text style={styles.cardText}>
                {item.bio || "Open to messages about services and products."}
              </Text>
              <Text style={styles.badges}>
                {item.verified ? "✓ Verified  " : ""}
                {item.topRated ? "★ Top rated" : ""}
              </Text>
            </Card>
          ))}
          <SectionTitle title={`Products (${products.length})`} />
          {products.map((item) => (
            <Card key={item.id} onPress={() => openProduct(item.id)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.muted}>
                {item.artisanName} · {item.area}
              </Text>
              <Text style={styles.price}>
                ₦{Number(item.price).toLocaleString()}
              </Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function Artisan({ id, user, token, openChat, back }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api(`/artisans/${id}`)
      .then(setData)
      .catch((e) => Alert.alert("Error", e.message));
  }, [id]);
  if (!data) return <Loading />;
  async function message(product) {
    if (user.role !== "customer")
      return Alert.alert(
        "Customers only",
        "Only customer accounts can start conversations.",
      );
    try {
      const conversation = await api(
        "/conversations",
        {
          method: "POST",
          body: JSON.stringify({ artisanId: data.artisan.id }),
        },
        token,
      );
      if (product)
        await api(
          `/conversations/${conversation.id}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              body: `I am asking about: ${product.name} (₦${product.price})`,
            }),
          },
          token,
        );
      openChat(conversation.id);
    } catch (e) {
      Alert.alert("Could not start conversation", e.message);
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Back onPress={back} />
      <Text style={styles.eyebrow}>
        {data.artisan.skill} · {data.artisan.area}
      </Text>
      <Text style={styles.title}>{data.artisan.name}</Text>
      <Text style={styles.lead}>{data.artisan.bio}</Text>
      <Button
        title={`Message ${data.artisan.name}`}
        onPress={() => message()}
      />
      <SectionTitle title="Products" />
      {data.products.map((p) => (
        <Card key={p.id} onPress={() => message(p)}>
          <Text style={styles.cardTitle}>{p.name}</Text>
          <Text>{p.description}</Text>
          <Text style={styles.price}>₦{Number(p.price).toLocaleString()}</Text>
          <Text style={styles.link}>Ask about this</Text>
        </Card>
      ))}
      <SectionTitle title="Reviews" />
      {data.reviews.map((r) => (
        <Card key={r.id}>
          <Text style={styles.cardTitle}>{"★".repeat(r.rating)}</Text>
          <Text>{r.comment || "No comment"}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function Product({ id, user, token, openChat, back }) {
  const [product, setProduct] = useState(null);
  useEffect(() => {
    api(`/products/${id}`)
      .then(setProduct)
      .catch((e) => Alert.alert("Error", e.message));
  }, [id]);
  if (!product) return <Loading />;
  async function ask() {
    if (user.role !== "customer") return Alert.alert("Customers only");
    try {
      const conversation = await api(
        "/conversations",
        {
          method: "POST",
          body: JSON.stringify({ artisanId: product.artisanId }),
        },
        token,
      );
      await api(
        `/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            body: `I am asking about: ${product.name} (₦${product.price})`,
          }),
        },
        token,
      );
      openChat(conversation.id);
    } catch (e) {
      Alert.alert("Could not start conversation", e.message);
    }
  }
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Back onPress={back} />
      <Text style={styles.eyebrow}>
        {product.artisanName} · {product.area}
      </Text>
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.lead}>{product.description}</Text>
      <Text style={styles.price}>
        ₦{Number(product.price).toLocaleString()}
      </Text>
      <Button title="Ask about this" onPress={ask} />
      <SectionTitle title="Reviews" />
      {product.reviews.map((r) => (
        <Card key={r.id}>
          <Text style={styles.cardTitle}>{"★".repeat(r.rating)}</Text>
          <Text>{r.comment || "No comment"}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function Inbox({ token, user, openChat }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api("/conversations", {}, token)
      .then(setItems)
      .catch((e) => Alert.alert("Inbox error", e.message));
  }, []);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR MESSAGES</Text>
      <Text style={styles.title}>Inbox</Text>
      {items.map((item) => (
        <Card key={item.id} onPress={() => openChat(item.id)}>
          <Text style={styles.cardTitle}>
            {user.role === "artisan" ? item.customerName : item.artisanName}
          </Text>
          <Text style={styles.muted}>
            {item.lastMessage || "No messages yet"}
          </Text>
          {Number(item.unreadCount) > 0 && (
            <Text style={styles.badges}>{item.unreadCount} unread</Text>
          )}
        </Card>
      ))}
      {!items.length && <Text style={styles.muted}>No conversations yet.</Text>}
    </ScrollView>
  );
}

function Chat({ id, user, token, back }) {
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [context, setContext] = useState(null);
  const [products, setProducts] = useState([]);
  const [requestOpen, setRequestOpen] = useState(false);
  async function load() {
    try {
      setMessages(await api(`/conversations/${id}/messages`, {}, token));
    } catch (e) {
      Alert.alert("Chat error", e.message);
    }
  }
  useEffect(() => {
    load();
    api("/conversations", {}, token)
      .then(async (items) => {
        const found = items.find((item) => String(item.id) === String(id));
        setContext(found);
        if (found?.artisanId) {
          const artisan = await api(`/artisans/${found.artisanId}`);
          setProducts(artisan.products || []);
        }
      })
      .catch(() => {});
  }, [id]);
  async function send() {
    if (!body.trim()) return;
    try {
      await api(
        `/conversations/${id}/messages`,
        { method: "POST", body: JSON.stringify({ body: body.trim() }) },
        token,
      );
      setBody("");
      load();
    } catch (e) {
      Alert.alert("Message not sent", e.message);
    }
  }
  return (
    <View style={styles.flex}>
      <View style={styles.chatHeader}>
        <Back onPress={back} />
        <Text style={styles.cardTitle}>
          {user.role === "artisan"
            ? context?.customerName || "Conversation"
            : context?.artisanName || "Conversation"}
        </Text>
      </View>
      <FlatList
        contentContainerStyle={styles.messages}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        renderItem={({ item }) =>
          item.type === "payment_request" ? (
            <PaymentActions
              message={item}
              user={user}
              token={token}
              refresh={load}
            />
          ) : (
            <View
              style={[styles.bubble, item.senderId === user.id && styles.mine]}
            >
              <Text style={item.senderId === user.id ? styles.mineText : null}>
                {item.body}
              </Text>
            </View>
          )
        }
        ListEmptyComponent={
          <Text style={styles.muted}>Start the conversation.</Text>
        }
      />
      {requestOpen && user.role === "artisan" && (
        <PaymentRequestForm
          conversationId={id}
          products={products}
          token={token}
          onDone={() => {
            setRequestOpen(false);
            load();
          }}
          onCancel={() => setRequestOpen(false)}
        />
      )}
      <View style={styles.composer}>
        {user.role === "artisan" && (
          <Pressable
            style={styles.addButton}
            onPress={() => setRequestOpen(!requestOpen)}
          >
            <Text style={styles.addButtonText}>＋</Text>
          </Pressable>
        )}
        <TextInput
          style={styles.messageInput}
          value={body}
          onChangeText={setBody}
          placeholder="Write a message…"
        />
        <Button title="Send" onPress={send} />
      </View>
    </View>
  );
}

function PaymentActions({ message, user, token, refresh }) {
  const [busy, setBusy] = useState(false);
  async function action(path, method = "POST") {
    setBusy(true);
    try {
      await api(`/orders/${message.orderId}${path}`, { method }, token);
      refresh();
    } catch (e) {
      Alert.alert("Order action failed", e.message);
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    setBusy(true);
    try {
      const data = await api(
        `/orders/${message.orderId}/pay`,
        { method: "POST" },
        token,
      );
      await Linking.openURL(data.authorizationUrl);
    } catch (e) {
      Alert.alert("Payment could not start", e.message);
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    try {
      await api(`/orders/${message.orderId}/verify`, {}, token);
      refresh();
    } catch (e) {
      Alert.alert("Payment verification failed", e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Text style={styles.eyebrow}>PAYMENT REQUEST</Text>
      <Text style={styles.cardTitle}>{message.orderDescription}</Text>
      <Text style={styles.price}>
        ₦{Number(message.amount / 100).toLocaleString()}
      </Text>
      <Text style={styles.muted}>Status: {message.orderStatus}</Text>
      {message.orderStatus === "requested" && user.role === "customer" && (
        <>
          <Button
            title={busy ? "Opening payment…" : "Accept and pay"}
            onPress={pay}
            disabled={busy}
          />
          {message.paymentUrl && (
            <Button
              title="Check payment status"
              secondary
              onPress={verify}
              disabled={busy}
            />
          )}
        </>
      )}
      {message.orderStatus === "requested" && user.role === "artisan" && (
        <Button
          title="Cancel request"
          secondary
          onPress={() => action("", "DELETE")}
          disabled={busy}
        />
      )}
      {message.orderStatus === "paid" && user.role === "artisan" && (
        <Button
          title="Mark as delivered"
          onPress={() => action("/deliver")}
          disabled={busy}
        />
      )}
      {message.orderStatus === "delivered" && user.role === "customer" && (
        <>
          <Button
            title="Confirm and release payment"
            onPress={() => action("/confirm")}
            disabled={busy}
          />
          <Button
            title="Report a problem"
            secondary
            onPress={() => action("/dispute")}
            disabled={busy}
          />
        </>
      )}
    </Card>
  );
}

function PaymentRequestForm({
  conversationId,
  products,
  token,
  onDone,
  onCancel,
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!amount || !description)
      return Alert.alert("Missing details", "Enter an amount and description.");
    setBusy(true);
    try {
      await api(
        `/conversations/${conversationId}/orders`,
        {
          method: "POST",
          body: JSON.stringify({
            amount,
            description,
            productId: productId || null,
          }),
        },
        token,
      );
      onDone();
    } catch (e) {
      Alert.alert("Request failed", e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.requestForm}>
      <Text style={styles.cardTitle}>Payment request</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Amount in ₦"
      />
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="What is this payment for?"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.productChoices}
      >
        {products.map((p) => (
          <Pressable
            key={p.id}
            style={[
              styles.choice,
              productId === String(p.id) && styles.choiceActive,
            ]}
            onPress={() => setProductId(String(p.id))}
          >
            <Text>{p.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.requestButtons}>
        <Button
          title={busy ? "Sending…" : "Send request"}
          onPress={submit}
          disabled={busy}
        />
        <Button title="Cancel" secondary onPress={onCancel} />
      </View>
    </View>
  );
}

function Orders({ token, user }) {
  const [data, setData] = useState({ orders: [] });
  useEffect(() => {
    api("/orders", {}, token)
      .then(setData)
      .catch((e) => Alert.alert("Orders error", e.message));
  }, []);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>PAYMENT HISTORY</Text>
      <Text style={styles.title}>My orders</Text>
      {data.orders.map((o) => (
        <Card key={o.id}>
          <Text style={styles.cardTitle}>{o.description}</Text>
          <Text>
            {user.role === "artisan"
              ? `Customer: ${o.customerName}`
              : `Artisan: ${o.artisanName}`}
          </Text>
          <Text style={styles.price}>
            ₦
            {Number(
              (user.role === "artisan" ? o.artisanAmount : o.amount) / 100,
            ).toLocaleString()}
          </Text>
          <Text style={styles.badges}>{o.status}</Text>
        </Card>
      ))}
      {!data.orders.length && <Text style={styles.muted}>No orders yet.</Text>}
    </ScrollView>
  );
}
function Profile({ user, logout }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
      <Text style={styles.title}>{user.name}</Text>
      <Text style={styles.lead}>{user.email}</Text>
      <Text style={styles.muted}>Role: {user.role}</Text>
      <Button title="Log out" onPress={logout} secondary />
    </ScrollView>
  );
}
function Tabs({ tab, setTab }) {
  return (
    <View style={styles.tabs}>
      {[
        ["home", "Home"],
        ["inbox", "Inbox"],
        ["orders", "Orders"],
        ["profile", "Profile"],
      ].map(([key, label]) => (
        <Pressable key={key} style={styles.tab} onPress={() => setTab(key)}>
          <Text style={[styles.tabText, tab === key && styles.tabActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} {...props} />
    </View>
  );
}
function Button({ title, onPress, secondary, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}
function Card({ children, onPress }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.card}>
      {children}
    </Pressable>
  );
}
function SectionTitle({ title }) {
  return <Text style={styles.section}>{title}</Text>;
}
function Back({ onPress }) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.back}>← Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  flex: { flex: 1, backgroundColor: C.cream },
  center: { justifyContent: "center", alignItems: "center" },
  content: { padding: 20, paddingBottom: 100 },
  auth: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: { fontSize: 30, fontWeight: "800", color: C.ink, marginBottom: 28 },
  eyebrow: {
    color: C.green,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: { color: C.ink, fontSize: 32, fontWeight: "800", marginBottom: 10 },
  lead: { color: C.ink, fontSize: 17, lineHeight: 25, marginBottom: 20 },
  muted: { color: C.muted, lineHeight: 21 },
  label: { color: C.ink, fontWeight: "700", marginBottom: 7 },
  field: { marginBottom: 14 },
  input: {
    backgroundColor: C.white,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    color: C.ink,
    marginBottom: 8,
  },
  button: {
    backgroundColor: C.green,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonText: { color: C.white, fontWeight: "800", fontSize: 16 },
  secondary: { backgroundColor: C.white, borderColor: C.green, borderWidth: 1 },
  secondaryText: { color: C.green },
  disabled: { opacity: 0.5 },
  segment: { flexDirection: "row", marginBottom: 12 },
  segmentButton: {
    flex: 1,
    padding: 13,
    backgroundColor: C.white,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.line,
  },
  segmentActive: { backgroundColor: "#DDEBE3", borderColor: C.green },
  link: {
    color: C.green,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 15,
  },
  error: { color: C.danger, marginVertical: 10, lineHeight: 20 },
  section: {
    color: C.ink,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 28,
    marginBottom: 10,
  },
  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: C.ink, fontSize: 17, fontWeight: "800", marginBottom: 6 },
  cardText: { color: C.ink, lineHeight: 21, marginTop: 8 },
  badges: { color: C.green, fontWeight: "700", marginTop: 8 },
  price: { color: C.green, fontSize: 20, fontWeight: "800", marginTop: 10 },
  back: { color: C.green, fontWeight: "800", marginBottom: 22 },
  tabs: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    flexDirection: "row",
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabText: { color: C.muted, fontWeight: "700" },
  tabActive: { color: C.green },
  chatHeader: {
    padding: 20,
    paddingBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  messages: { padding: 20, paddingBottom: 90 },
  bubble: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    alignSelf: "flex-start",
    maxWidth: "85%",
  },
  mine: { backgroundColor: C.green, alignSelf: "flex-end" },
  mineText: { color: C.white },
  composer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.line,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 11,
    backgroundColor: C.cream,
    marginRight: 8,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DDEBE3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  addButtonText: { color: C.green, fontSize: 20, fontWeight: "800" },
  requestForm: {
    position: "absolute",
    bottom: 70,
    left: 12,
    right: 12,
    backgroundColor: C.white,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  productChoices: { maxHeight: 44, marginVertical: 4 },
  choice: {
    padding: 10,
    backgroundColor: C.cream,
    borderRadius: 8,
    marginRight: 8,
  },
  choiceActive: {
    backgroundColor: "#DDEBE3",
    borderColor: C.green,
    borderWidth: 1,
  },
  requestButtons: { flexDirection: "row", gap: 8 },
});
