import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProject } from "@/context/ProjectContext";
import { PageHeader, Panel, PanelTitle } from "./common";

export function SettingsSection() {
  const { state, patchProject } = useProject();
  const project = state.project;
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [slug, setSlug] = useState(project.slug);

  const save = () => {
    if (name.trim().length < 2 || description.trim().length < 20 || !/^[a-z0-9-]+$/.test(slug)) {
      toast.error("Review the project fields");
      return;
    }
    patchProject({ name: name.trim(), description: description.trim(), slug });
    toast.success("Project settings saved");
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="Settings"
        subtitle="Manage project details and operational defaults."
        action={<Button onClick={save}><Save /> Save changes</Button>}
      />
      <Panel>
        <PanelTitle title="General settings" description="Project identity and regional defaults" />
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <Label htmlFor="settings-name">Project name</Label>
            <Input id="settings-name" value={name} onChange={(event) => setName(event.target.value.slice(0, 80))} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="settings-slug">Project slug</Label>
            <Input id="settings-slug" value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().slice(0, 80))} className="mt-1.5" />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="settings-description">Description</Label>
            <Textarea id="settings-description" value={description} onChange={(event) => setDescription(event.target.value.slice(0, 320))} className="mt-1.5" />
          </div>
          <div>
            <Label>Timezone</Label>
            <Select defaultValue="Asia/Dhaka">
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Dhaka">Asia/Dhaka</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Default language</Label>
            <Select defaultValue="English">
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="English">English</SelectItem>
                <SelectItem value="Bengali">Bengali</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Panel>
      <Panel>
        <PanelTitle title="Project settings" description="Operational defaults" />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <Label>Default workspace tab</Label>
            <Select defaultValue="overview">
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
                <SelectItem value="database">Database</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Environment</Label>
            <Select value={project.environment} onValueChange={(value) => patchProject({ environment: value as typeof project.environment })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md bg-muted p-3 text-sm lg:col-span-2">
            <span className="text-muted-foreground">Project ID</span>
            <p className="mt-1 font-mono text-xs">{project.id}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
