import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createRoutesStub } from "react-router";
import { plainText } from "~/lib/text";
import LessonViewer from "./courses.$slug.lessons.$lessonId";

type LoaderData = Parameters<typeof LessonViewer>[0]["loaderData"];
type FullLessonData = Extract<LoaderData, { view: "full" }>;

function fullLesson(overrides: Partial<FullLessonData> = {}): FullLessonData {
  const lesson = {
    id: 20,
    moduleId: 1,
    title: "What is a REST API?",
    content: "intro",
    videoUrl: null,
    githubRepoUrl: null,
    position: 1,
    durationMinutes: 10,
  };
  return {
    view: "full",
    course: { id: 2, title: "Building REST APIs", slug: "rest" },
    curriculum: [],
    module: { id: 1, title: "API Fundamentals" },
    lesson,
    contentHtml: "<h2>REST API Fundamentals</h2>",
    lessonStatus: null,
    enrolled: true,
    currentUserId: 5,
    prevLesson: null,
    nextLesson: { id: 21, title: "Setting Up Express" },
    quiz: null,
    bestAttempt: null,
    lastWatchPosition: 0,
    watchProgress: 0,
    lessonProgressMap: {},
    comments: [],
    canModerate: false,
    instructorName: "Alex",
    bookmarked: false,
    note: null,
    ...overrides,
  } as unknown as FullLessonData;
}

function render(loaderData: LoaderData) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => (
        <LessonViewer
          {...({ loaderData } as Parameters<typeof LessonViewer>[0])}
        />
      ),
    },
  ]);
  return renderToString(<Stub />);
}

describe("lesson page notes", () => {
  it("puts the Student's notes after the lesson content, right before Questions & Discussion", () => {
    const html = render(fullLesson());

    const content = html.indexOf("REST API Fundamentals");
    const upNext = html.indexOf("Up next: ");
    const notes = html.indexOf("Your notes");
    const discussion = html.indexOf("Questions &amp; Discussion");

    expect(content).toBeGreaterThan(-1);
    expect(notes).toBeGreaterThan(content);
    expect(notes).toBeGreaterThan(upNext);
    expect(discussion).toBeGreaterThan(notes);
  });

  it("shows the saved note in the notes box", () => {
    const html = render(
      fullLesson({
        note: {
          body: plainText("idempotent means safe to retry"),
          updatedAt: "2026-11-20T10:00:00Z",
        },
      })
    );

    expect(html).toContain("idempotent means safe to retry");
  });

  it("shows no notes box to a visitor who is not signed in", () => {
    const html = render(fullLesson({ currentUserId: null, enrolled: false }));

    expect(html).not.toContain("Your notes");
    expect(html).toContain("Questions &amp; Discussion");
  });
});
