import { describe, it, expect } from "vitest";
import { flattenCourseLessons } from "../course.server";
import { calculateGrade } from "../quiz.server";

describe("flattenCourseLessons", () => {
  it("lists every lesson in module order, carrying its module", () => {
    const flat = flattenCourseLessons({
      modules: [
        {
          id: 1,
          title: "Basics",
          lessons: [
            { id: 10, title: "Intro", moduleId: 1 },
            { id: 11, title: "Setup", moduleId: 1 },
          ],
        },
        { id: 2, title: "Empty", lessons: [] },
        {
          id: 3,
          title: "Routing",
          lessons: [{ id: 30, title: "Routes", moduleId: 3 }],
        },
      ],
    });

    expect(flat).toEqual([
      { id: 10, title: "Intro", moduleId: 1, moduleTitle: "Basics" },
      { id: 11, title: "Setup", moduleId: 1, moduleTitle: "Basics" },
      { id: 30, title: "Routes", moduleId: 3, moduleTitle: "Routing" },
    ]);
  });

  it("returns no lessons for a course with no modules", () => {
    expect(flattenCourseLessons({ modules: [] })).toEqual([]);
  });
});

describe("calculateGrade", () => {
  it.each([
    [1, "A"],
    [0.9, "A"],
    [0.89, "B"],
    [0.8, "B"],
    [0.79, "C"],
    [0.7, "C"],
    [0.69, "D"],
    [0.6, "D"],
    [0.59, "F"],
    [0, "F"],
  ])("grades a score of %s as %s", (score, grade) => {
    expect(calculateGrade(score)).toBe(grade);
  });
});
