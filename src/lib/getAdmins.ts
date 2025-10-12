import { createClient } from "@supabase/supabase-js";

const projectUrl = "https://grlyhylqbekhrmfwgyme.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybHloeWxxYmVraHJtZndneW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc3MDEsImV4cCI6MjA3NTAwMzcwMX0.ZLulmspi7qsZhTSCCi69oV8HCgqVVuHOtd-D2AjJ9Zg";

const supabase = createClient(projectUrl, anonKey);

async function getAdmins() {
  const { data, error } = await supabase.from("administrators").select("matricula");
  if (error) {
    console.error("Erro ao buscar administradores:", error);
    return;
  }
  console.log("Matrículas de administradores cadastradas:", data);
}

getAdmins();